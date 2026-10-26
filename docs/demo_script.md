# SentinelOS — 3-Minute Live Hackathon Demo Script

**Speaker Persona:** Senior Security Architect & AI Agent Engineer  
**Demo Target:** SentinelOS Security Lab (Isolated Local Testbed)  
**Main Product Message:** *Build with AI. Stay in control.*

---

## 0:00 – 0:30: Introduction & The Core Problem

> *"Hello judges! As developers adopt AI coding tools like Claude Code, Cursor, and Antigravity, we gain massive productivity — but we also introduce serious blind spots: exposed credentials, unparameterized SQL queries, vulnerable packages, and unchecked agent permissions.*
>
> *Today, we present **SentinelOS** — a local-first, autonomous AI security platform that acts like a senior security engineer working right alongside your AI tools.*
>
> *Our core technical principle is simple: **The LLM reasons. The orchestrator coordinates. Security tools gather evidence. The policy engine controls actions. The verification engine checks results. We never trust an LLM alone to declare its own fixes successful.***

---

## 0:30 – 1:15: Autonomous Investigation & ThreatLens

> *"Here in the SentinelOS Desktop Dashboard, we have selected our demo workspace: **SentinelOS Security Lab**. Notice that all three host security scanners — **Gitleaks**, **Semgrep**, and **OSV-Scanner** — are verified and ready.*
>
> *(Click **Run Autonomous Audit**)*
>
> *Watch the autonomous orchestrator go to work in the **Investigation Center**. Using **Meta Llama 3.3**, it first analyzes the project layout, produces a structured investigation plan, and selects approved tools.*
>
> *Look at the live telemetry: It executes Gitleaks to hunt for secrets, Semgrep for static code vulnerabilities, OSV-Scanner for package CVEs, and our custom Prompt Shield to test AI endpoint guardrails.*
>
> *In the **Findings** tab, we see concrete evidence: a hardcoded demo API key in `config.py`, an unparameterized SQL query in `app.py`, and a vulnerable `urllib3` package.*
>
> *Now let's switch to **Attack Paths** — our **ThreatLens** graph models how an unauthenticated user on `/api/users/search` can exploit the SQL injection to reach backend tables and sensitive configuration secrets. Notice how confirmed evidence is clearly separated from inferred relationships.*

---

## 1:15 – 2:00: Fix & Verify Workflow

> *"Now let's fix the vulnerability without leaving SentinelOS.*
>
> *(Click **Fix & Verify** -> select SQL Injection in `app.py`)*
>
> *SentinelOS generates a precise unified diff patch, replacing dangerous string concatenation with parameter binding. We review the diff side-by-side.*
>
> *(Click **Apply Patch to Workspace**)*
>
> *The patch is safely written within the workspace boundary with an automatic backup created.*
>
> *(Click **Run Verification & Tests**)*
>
> *Crucially, we do **not** ask the LLM if the fix worked. The **Verification Engine** reruns Semgrep SAST and executes the automated test suite. Both confirm zero remaining SQL injection instances, upgrading the finding to **VERIFIED FIXED**.*

---

## 2:00 – 2:30: Scenario E — Deterministic Policy Denial

> *"Now let's demonstrate host defense under **AgentFence Shield Mode**.*
>
> *(Click **Test Policy Denial** in the top header)*
>
> *SentinelOS attempts an unauthorized file overwrite on `protected_admin_keys.json` through the agent execution path.*
>
> *Instantly, our independent **PolicyEngine** intercepts the operation and returns a hard **DENY**. The model cannot override this decision. Notice the live notification and real-time counter increment in Shield Mode.*

---

## 2:30 – 3:00: Activity Audit & Conclusion

> *(Click **Activity & Audit**)*
>
> *Every investigation cycle, tool invocation, and policy decision is recorded in an immutable, append-only audit trail with automatic secret redaction.*
>
> *(Click **Reset Lab**)*
>
> *With one click, the demo lab is restored to its initial state for deterministic, repeatable testing.*
>
> *SentinelOS proves that developers don't have to choose between AI velocity and application security. **Build with AI. Stay in control.** Thank you!*
