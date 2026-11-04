# Development Guide

This file documents the architecture and conventions for developers working in this repository.

## What this is

SentinelOS: a local-first AI security platform. FastAPI backend (`backend/`, :8000) + React/Vite/Tailwind UI (`frontend/`, :5173) + an intentionally vulnerable FastAPI target app (`demo_lab/`, :8001) that the scanners and demo flows run against.

Core design rule (from README/docs): the LLM only reasons and plans. The deterministic `PolicyEngine` decides what may run, and the `VerificationEngine` (scanner reruns + pytest) decides whether a fix worked. Model output must never bypass or override a policy decision.

## Commands

All Python runs through the venv at `backend/.venv` (created by `./scripts/setup.sh`).

```bash
./scripts/setup.sh                 # venv + pip install, npm install + build, reset demo lab
./scripts/start_all.sh             # backend (backend/run.py) + vite dev server
./scripts/reset_demo.sh            # restore demo_lab/ to its vulnerable state (demo_lab/reset.py)

# Backend tests
PYTHONPATH=backend backend/.venv/bin/pytest -v backend/tests
PYTHONPATH=backend backend/.venv/bin/pytest -v backend/tests/test_policy_engine.py::<test_name>
backend/.venv/bin/pytest -v demo_lab/test_suite.py      # demo lab's own tests (used by verification)

# Frontend (from frontend/)
npm run dev
npm run build                      # tsc && vite build — the only type check; no linter configured

docker compose up                  # alt: backend exposed on host port 8005, not 8000
```

Notes:
- Backend tests use the real `DATABASE_URL` (default `sqlite:///./sentinel.db`, relative to cwd), not an isolated test DB.
- Applying patches (Fix & Verify, `test_remediation_verify.py`) mutates files in `demo_lab/`. Run `./scripts/reset_demo.sh` afterwards.
- Optional host scanners: `gitleaks`, `semgrep`, `osv-scanner`. Tools in `backend/app/tools/` fall back to pure-Python scanning when a binary is missing.
- With no model API key, `ModelGateway._fallback_reasoning` returns deterministic canned JSON, so the full flow works offline. Tests rely on this. To force offline mode when `.env` has keys, prefix with `MODEL_API_KEY= PROD_MODEL_API_KEY= META_API_KEY=`.

## Architecture

**Request flow for an investigation**
1. `POST /api/investigations` (`api/endpoints/investigations.py`) creates the row and schedules `SentinelOrchestrator.run_investigation_async` as a FastAPI `BackgroundTask`.
2. `core/orchestrator.py` is a hand-written sequential state machine (`InvestigationState`), not LangGraph. Steps: discovery, LLM planning (`PLANNING_PROMPT`), planned tools up to `MAX_TOOL_CALLS`, an adaptive `code_flow_trace` on the file of a suspected SQLi, finding interpretation, attack-path modeling, then an auto fix-and-verify attempt on the highest-severity finding that has a safe fix. Offline, attack paths come from `_evidence_attack_paths` (real findings only). It opens its own `SessionLocal()` because it runs outside the request.
3. Every tool call goes through `core/tool_registry.py::execute_tool`. It calls `PolicyEngine.evaluate_action` first: `changes_files` tools count as `write`, all others as `read`. Then it runs `BaseTool.execute`, records a `ToolRun`, and writes an audit event. To add a scanner, subclass `tools/base.py::BaseTool`, set `tool_id`, and register it in `ToolRegistry.__init__`. Planner prompts refer to tools by `tool_id` (`secret_scan`, `sast_scan`, `dependency_scan`, `prompt_shield_test`, `test_runner`, `code_flow_trace`).
4. Progress is pushed through `core/event_bus.py`, an in-memory asyncio pub/sub. It serves SSE at `/api/investigations/{id}/events` (closes on `finished`/`failed`/`cancelled`) and `/api/investigations/events/live` (global). It runs in one process only, with no persistence.

**Policy layer**: `core/policy_engine.py` returns `ALLOW`/`DENY`/`REQUIRE_APPROVAL`. Checks run in this order: canonical-path boundary (`resolve()` + parents), tools blocked by policy, then protected paths (applied to read as well as write/execute). Protected paths are `DEFAULT_PROTECTED_PATTERNS` plus `Workspace.protected_paths` plus `Policy.blocked_patterns`. `core/agent_fence.py` wraps it. `AgentFence.evaluate_claude_code_hook` handles Claude Code PreToolUse payloads posted by `scripts/agentfence_hook.py` to `POST /api/shield/hooks/claude-code`. It only evaluates paths inside a registered workspace, and Bash commands are checked by resolving path-like tokens. Non-ALLOW hook decisions are published on the event bus as `agent_fence_decision`, which the UI shows as a toast. Denials are audited via `AuditService`.

**Remediation**: `core/verification_engine.py` handles propose → apply → verify → rollback.
- `propose_remediation` asks the model (`REMEDIATION_PROMPT`) for exact `{find, replace}` edits. `_apply_edits` applies them to the real file and rejects any edit that doesn't match exactly once or touches `[REDACTED_SECRET]` (the model sees redacted source). The result must pass `_is_valid_syntax`. Otherwise `_rule_based_patch` handles a few generic shapes. If neither works it raises `NoAutomaticFixError` (HTTP 422).
- The diff is computed with `difflib`. `patched_content`, `generated_by` (`model:<name>` or `rule-based`) and the source snapshot (`backup_file_content`) are stored at proposal time.
- `apply_remediation` re-checks policy, refuses if the file drifted since proposal, and records `baseline_test_failures`.
- `verify_fix` passes only if the scanner no longer reports the same `file_path`+`rule_id` and there are no new test failures compared to the baseline.
- `_fix_prompt_echo` is the only demo_lab-specific rule. Keep it in sync with `demo_lab/app.py` and `demo_lab/reset.py`.

**Attack Lab (sandboxed red-team, the headline flow)**: `POST /api/attack-lab/run` schedules `core/attack_lab.py::AttackLab.run_async`, which streams progress on the global SSE bus (`attack_*` events). It:
1. copies the workspace to a temp dir (real files are never touched; only the normal Apply flow writes back),
2. `core/sandbox.py` detects a FastAPI/Flask app, builds a throwaway Docker image and runs it locked down (`--cap-drop ALL`, `--security-opt no-new-privileges`, memory/cpu/pids caps, `127.0.0.1`-only port, `--rm`),
3. `core/attack_engine.py` reads the live `/openapi.json`, Muse Wonder plans exploits (`ATTACK_PLAN_PROMPT`, deterministic fallback for SQLi + prompt injection), fires them only at the sandbox, and computes the verdict (`BREACHED`/`SURVIVED`/`NOT_REACHABLE`/`ERROR`) from the real response — never the model's claim,
4. fixes breached findings in the copy via `VerificationEngine.compute_patch` (pure, applied cumulatively per file so two fixes in one file don't clobber), rebuilds, re-attacks,
5. `core/origin_tracer.py` git-blames each finding's line for the introducing commit and flags AI-authored commits (Claude/Cursor/Copilot trailers).
Results persist as `AttackResult` rows; `core/report.py` renders a self-contained HTML report at `GET /api/attack-lab/report`. Requires Docker (`GET /api/attack-lab/status`). `detect_web_app` needs `reset.py`-style string matches avoided, so it prefers real entry filenames. Cloned repos carry `no_code_execution`, but the sandbox still runs their code inside Docker by design.

**Model gateway**: `core/model_gateway.py` uses an OpenAI-compatible client. Every `generate_json` result carries `_source` (`model`/`fallback`) and `_model`, so callers and the UI can show what really produced it. `config.py` is Meta-only: per-task model from `PROD_*_MODEL` (`muse-spark-1.3` planning, `muse-wonder-1.0` reasoning + patches; IDs verified via `GET /v1/models`, there is no `muse-code` API model). The legacy `MODEL_*` env vars override. Muse models are reasoning models: never set a small `max_tokens`, it yields `content: null`. `generate_json` infers the task type from keywords in the system prompt, so prompt wording in `core/prompts.py` affects model routing. Redact secrets (`AuditService.redact`) before anything reaches the model, logs, SSE or DB.

**DB**: SQLAlchemy 2.0 + SQLite, models in `db/models.py`. There are no Alembic migrations. `init_db()` runs `create_all` and then adds any column listed in `db/session.py::ADDED_COLUMNS`. Register every new column on an existing table there.

**Workspaces**: `POST /api/workspaces/clone` shallow-clones public github/gitlab/bitbucket HTTPS repos into `CLONE_ROOT` (default `~/.sentinelos/repos`). Clones get `no_code_execution` in `enabled_checks`, so `test_runner` never runs their code. `test_runner` uses `sys.executable -m pytest`. Prompt Shield probes the HTTP endpoint only for the demo lab (`config.get_demo_lab_dir`, which requires `reset.py` to exist) or when `endpoint_url` is passed.

**Frontend**: no router. `App.tsx` holds all global state (`currentTab`, workspaces, findings, and so on) and switches between `pages/*` by `NavTab`. `InvestigationCenter` has four subtabs: `timeline`, `attack_paths`, `fix_verify`, `agentfence`. Model names shown in the UI come from `/api/health` (`modelFor(task)`), never hardcoded. All HTTP calls go through `src/api/client.ts` using relative `/api`. Vite proxies `/api` to `VITE_API_URL` (default `http://127.0.0.1:8000`). Shared types live in `src/types/index.ts` and mirror `backend/app/schemas/`. Update both when changing an API shape.
