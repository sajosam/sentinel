"""
Origin tracing: for a vulnerable line, find the commit that introduced it, who wrote it,
and whether an AI coding agent co-authored that commit.

Pure `git` subprocess calls, read-only. Safe to run on any cloned repo.
"""
import re
import subprocess
from pathlib import Path
from typing import Dict, Optional

# Commit trailers / author signatures left by AI coding agents
AI_SIGNATURES = [
    re.compile(r"co-authored-by:\s*claude", re.IGNORECASE),
    re.compile(r"generated with \[?claude code", re.IGNORECASE),
    re.compile(r"co-authored-by:.*(cursor|antigravity|copilot|codeium|windsurf)", re.IGNORECASE),
    re.compile(r"\b(cursor|antigravity|github-copilot)\[bot\]", re.IGNORECASE),
    re.compile(r"🤖", re.IGNORECASE),
]


def _git(repo: Path, *args: str, timeout: int = 15) -> Optional[str]:
    try:
        res = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True, text=True, timeout=timeout
        )
    except Exception:
        return None
    if res.returncode != 0:
        return None
    return res.stdout


def _detect_ai(text: str) -> Optional[str]:
    for pat in AI_SIGNATURES:
        m = pat.search(text)
        if m:
            label = m.group(0).split(":")[-1].strip()
            return label or "AI agent"
    return None


def trace_line(repo: Path, rel_path: str, line_number: Optional[int]) -> Dict[str, Optional[str]]:
    """
    Return origin info for a file line:
      { commit, short, author, email, date, subject, ai_authored (bool), ai_agent }
    Any field may be None when git data is unavailable (e.g. shallow clone, uncommitted file).
    """
    empty = {
        "commit": None, "short": None, "author": None, "email": None,
        "date": None, "subject": None, "ai_authored": False, "ai_agent": None,
    }
    if not (repo / ".git").exists():
        return empty

    line = line_number or 1
    # Porcelain blame of the single line gives the introducing commit + author metadata
    blame = _git(repo, "blame", "-L", f"{line},{line}", "--porcelain", "--", rel_path)
    commit = None
    info: Dict[str, Optional[str]] = dict(empty)
    if blame:
        first = blame.splitlines()[0].split(" ")[0] if blame.strip() else ""
        if re.fullmatch(r"[0-9a-f]{40}", first or ""):
            commit = first
        for raw in blame.splitlines():
            if raw.startswith("author "):
                info["author"] = raw[len("author "):].strip()
            elif raw.startswith("author-mail "):
                info["email"] = raw[len("author-mail "):].strip().strip("<>")
            elif raw.startswith("author-time "):
                try:
                    from datetime import datetime, timezone
                    ts = int(raw[len("author-time "):].strip())
                    info["date"] = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
                except Exception:
                    pass
            elif raw.startswith("summary "):
                info["subject"] = raw[len("summary "):].strip()

    if not commit:
        return info

    info["commit"] = commit
    info["short"] = commit[:8]

    # Full commit message, to read AI co-author trailers that blame's summary omits
    body = _git(repo, "show", "-s", "--format=%B%n%an%n%ae", commit) or ""
    agent = _detect_ai(body)
    info["ai_authored"] = bool(agent)
    info["ai_agent"] = agent
    return info
