#!/usr/bin/env python3
"""
SentinelOS AgentFence hook for Claude Code (PreToolUse).

Claude Code pipes each pending tool call to this script as JSON on stdin. The script asks the local
SentinelOS service for a policy decision and tells Claude Code to deny, ask, or proceed.

Install by adding to .claude/settings.json (project) or ~/.claude/settings.json (user):

  {
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "Read|Write|Edit|MultiEdit|NotebookEdit|Grep|Glob|Bash",
          "hooks": [{ "type": "command", "command": "python3 /path/to/sential/scripts/agentfence_hook.py" }]
        }
      ]
    }
  }

Environment:
  SENTINEL_URL          SentinelOS API base (default http://127.0.0.1:8000)
  SENTINEL_FAIL_CLOSED  "1" to deny tool calls when SentinelOS is unreachable (default: allow)

Standard library only, so it runs under any python3.
"""
import json
import os
import sys
import urllib.error
import urllib.request

SENTINEL_URL = os.environ.get("SENTINEL_URL", "http://127.0.0.1:8000").rstrip("/")
FAIL_CLOSED = os.environ.get("SENTINEL_FAIL_CLOSED") == "1"


def respond(decision: str, reason: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # Not a hook payload; never block on our own parse errors

    request = urllib.request.Request(
        f"{SENTINEL_URL}/api/shield/hooks/claude-code",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        if FAIL_CLOSED:
            respond("deny", f"SentinelOS AgentFence unreachable ({e}); failing closed.")
        print(f"SentinelOS AgentFence unreachable ({e}); allowing tool call.", file=sys.stderr)
        sys.exit(0)

    decision = result.get("decision")
    reason = f"SentinelOS AgentFence: {result.get('reason', 'policy decision')}"
    if decision == "DENY":
        respond("deny", reason)
    if decision == "REQUIRE_APPROVAL":
        respond("ask", reason)
    sys.exit(0)


if __name__ == "__main__":
    main()
