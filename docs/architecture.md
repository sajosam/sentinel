# SentinelOS Architecture Specification

**Build with AI. Stay in control.**

SentinelOS is a local-first, autonomous AI security platform designed to help developers build software with AI coding agents safely.

---

## 1. Core Architectural Principle

```
The LLM reasons. 
The orchestrator coordinates. 
Security tools gather evidence. 
The policy engine controls actions. 
The verification engine checks results.
```

An LLM is **never** trusted alone to enforce security, make unrestricted host decisions, or declare its own code patches successful.

---

## 2. System Architecture Diagram

```mermaid
graph TD
    subgraph Host Developer Machine
        UI[Desktop UI - React + Vite + Tailwind CSS]
        
        subgraph SentinelOS Core Engine
            API[FastAPI Local Security Service :8000]
            DB[(SQLite / SQLAlchemy Storage)]
            AF[AgentFence Policy Engine]
            AL[Audit Service with Redaction]
            BUS[SSE Event Bus]
            
            subgraph Sentinel Intelligence Orchestrator
                LG[Orchestrator - sequential state machine]
                MG[Model Gateway - Meta Model API / Muse]
                TR[Tool Registry & Execution Gate]
                VE[Verification Engine]
            end
            
            subgraph Scanner Integrations
                GL[Gitleaks Scanner CLI]
                SG[Semgrep SAST CLI]
                OSV[OSV-Scanner CLI]
                PS[Prompt Shield AI Tester]
                TRUN[Native Test Runner]
            end
        end
        
        subgraph Isolated Demo Target
            LAB[SentinelOS Security Lab :8001]
            CONFIG[config.py - Synthetic Key]
            APP[app.py - SQLi & Prompt Test]
            REQ[requirements.txt - Vulnerable Dep]
            KEYS[protected_admin_keys.json - Protected Root]
        end
    end

    UI <-->|REST + SSE Live Events| API
    API --> DB
    API --> AF
    API --> AL
    API --> BUS
    API --> LG
    LG --> MG
    LG --> TR
    TR --> AF
    TR --> GL
    TR --> SG
    TR --> OSV
    TR --> PS
    TR --> TRUN
    VE --> TR
    AF -->|Deterministic Block| KEYS
    GL --> CONFIG
    SG --> APP
    OSV --> REQ
    PS --> APP
```

---

## 3. Component Breakdown

### A. Desktop Frontend (React + TypeScript + Vite + Tailwind CSS)
- **Screens** (sidebar: Overview, Investigations, Findings, Settings):
  1. **Connect a project**: Security Lab, clone a public Git repo, or a local folder, with live scanner and model readiness.
  2. **Overview**: metric cards, latest investigation, findings needing attention, recent enforcement.
  3. **Investigations**, with four tabs:
     - **Scan Timeline**: each step with the model that served it, scanner output, and the policy decision.
     - **Attack Paths (ThreatLens)**: nodes plus edges labeled CONFIRMED or INFERRED.
     - **Fix & Verify**: model or rule-based patch (tagged), diff, apply, verify against re-scan and baseline tests, rollback.
     - **AgentFence & Audit**: Claude Code hook setup and status, blocked actions, full audit ledger.
  4. **Findings**: filterable list with evidence and remediation guidance.
  5. **Settings**: live model-per-task mapping and scanner detection.

### B. Local Security Service (FastAPI + SQLAlchemy + Pydantic v2)
- Serves local-only API (`http://127.0.0.1:8000`).
- Validates canonical filesystem paths (`Path.resolve().is_relative_to(canonical_root)`).
- Rejects path traversal (`..`, `/etc`, `~`).
- Employs append-only audit logging with automated credential redaction.

### C. Policy Engine & AgentFence
- Independent deterministic evaluator returning `ALLOW`, `DENY`, or `REQUIRE_APPROVAL`.
- Evaluates: requested tool, workspace boundaries, file paths, command/arguments, and action risk level.
- Shield Mode locks sensitive files (`.env`, `protected_admin_keys.json`, `*.key`) against modification.
- Model output **cannot** override a policy decision.

### D. Model Gateway
- OpenAI-compatible client for the Meta Model API (`muse-spark-1.3`, `muse-wonder-1.0`).
- Redacts sensitive context prior to calling remote APIs.
- Employs retry logic, timeouts, and structured JSON parsing.
- Deterministic fallback reasoning engine ensuring full offline functionality and robust test execution.

### E. Security Scanner Integrations
- **Gitleaks** (CLI v8.30.1): Secret scanning across commits and working directories.
- **Semgrep** (CLI v1.182.0): Static application security testing (SAST) for SQL injection and unsafe patterns.
- **OSV-Scanner** (CLI v2.7.0): Supply chain known CVE matching against package manifests.
- **Prompt Shield Tester**: Automated injection probes, instruction leak tests, and secret extraction defense checks.
- **Native Test Runner**: Automated pytest test execution for patch regression testing.

### F. Verification Engine
- Generates unified diff patches within workspace boundaries.
- Creates backup of original file content before modification.
- Reruns scanners and automated test suites on modified codebase.
- Evaluates before-and-after results: `passed`, `failed`, or `inconclusive`.
- Supports one-click rollback to restore previous state.

---

## 4. Security Principles

1. **Subprocess Isolation**: Commands are invoked using argument arrays (`subprocess.run(["gitleaks", ...])`), strictly rejecting unrestricted shell strings.
2. **Canonical Boundaries**: Path resolution guarantees tools only operate inside the permitted workspace.
3. **Secret Redaction**: Credentials and sensitive tokens are scrubbed from logs, model prompts, SSE streams, and database storage.
4. **Append-Only Audit**: All system actions, tool executions, and policy decisions are immutably logged with timestamps and justifications.
