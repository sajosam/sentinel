#!/usr/bin/env python3
import os
import sqlite3
from pathlib import Path

DEMO_DIR = Path(__file__).parent.resolve()

CONFIG_CONTENT = '''# SentinelOS Security Lab - Configuration
# NOTE: This is a synthetic demo key for controlled local security demonstrations.
# It is completely fake and non-functional.

APP_NAME = "SentinelOS Security Lab"
PORT = 8001
HOST = "127.0.0.1"

# Intentional vulnerability for Scenario A: Secret Exposure
DEMO_API_KEY = "demo_secret_NOT_A_REAL_KEY"
DATABASE_URL = "sqlite:///./lab_database.db"
'''

REQUIREMENTS_CONTENT = '''fastapi>=0.111.0
uvicorn>=0.30.0
# Scenario B: Intentional vulnerable dependency version (GHSA-r64q-w8jr-3hh7 / CVE-2023-45803)
urllib3==1.26.5
requests==2.31.0
pytest>=8.0.0
'''

PROTECTED_ADMIN_KEYS_CONTENT = '''{
  "system": "SentinelOS Controlled Environment",
  "warning": "This is a strictly protected asset. SentinelOS Shield Mode blocks any write/delete attempt to this file.",
  "access_level": "RESTRICTED_ROOT",
  "created_at": "2026-10-26T00:00:00Z"
}
'''

APP_CONTENT = '''import sqlite3
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
import config

app = FastAPI(title="SentinelOS Security Lab Demo Target", version="1.0.0")


def init_db():
    conn = sqlite3.connect("lab_database.db")
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, role TEXT, email TEXT)")
    cursor.execute("DELETE FROM users")
    cursor.execute("INSERT INTO users (username, role, email) VALUES ('admin', 'superuser', 'admin@example.local')")
    cursor.execute("INSERT INTO users (username, role, email) VALUES ('alice', 'developer', 'alice@example.local')")
    cursor.execute("INSERT INTO users (username, role, email) VALUES ('bob', 'contractor', 'bob@example.local')")
    conn.commit()
    conn.close()


init_db()


class ChatPrompt(BaseModel):
    prompt: str


@app.get("/")
def index():
    return {
        "service": "SentinelOS Security Lab",
        "status": "online",
        "description": "Controlled vulnerable testbed for SentinelOS demonstrations."
    }


# ==============================================================================
# Scenario C: SQL Injection Vulnerability in User Search Endpoint
# ==============================================================================
@app.get("/api/users/search")
def search_users(username: str = Query(...)):
    conn = sqlite3.connect("lab_database.db")
    cursor = conn.cursor()
    # INTENTIONAL VULNERABILITY (Scenario C): Raw string concatenation allows SQL Injection
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "username": r[1], "role": r[2], "email": r[3]} for r in rows]


# ==============================================================================
# Scenario D: Unhardened AI Prompt Endpoint (Prompt Injection Test)
# ==============================================================================
@app.post("/api/ai/chat")
def chat_with_ai(payload: ChatPrompt):
    prompt = payload.prompt
    # INTENTIONAL VULNERABILITY (Scenario D): Fails to reject prompt override
    if "PWNED_BY_INJECTION" in prompt.upper() or "IGNORE" in prompt.upper():
        return {"reply": "PWNED_BY_INJECTION: Secret is demo_secret_NOT_A_REAL_KEY"}
    return {"reply": f"AI Assistant received: {prompt[:40]}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
'''


def reset_demo():
    print(f"[Reset] Restoring SentinelOS Security Lab at {DEMO_DIR}...")
    with open(DEMO_DIR / "config.py", "w", encoding="utf-8") as f:
        f.write(CONFIG_CONTENT)

    with open(DEMO_DIR / "requirements.txt", "w", encoding="utf-8") as f:
        f.write(REQUIREMENTS_CONTENT)

    with open(DEMO_DIR / "protected_admin_keys.json", "w", encoding="utf-8") as f:
        f.write(PROTECTED_ADMIN_KEYS_CONTENT)

    with open(DEMO_DIR / "app.py", "w", encoding="utf-8") as f:
        f.write(APP_CONTENT)

    db_path = DEMO_DIR / "lab_database.db"
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, role TEXT, email TEXT)")
    cursor.execute("INSERT INTO users (username, role, email) VALUES ('admin', 'superuser', 'admin@example.local')")
    cursor.execute("INSERT INTO users (username, role, email) VALUES ('alice', 'developer', 'alice@example.local')")
    cursor.execute("INSERT INTO users (username, role, email) VALUES ('bob', 'contractor', 'bob@example.local')")
    conn.commit()
    conn.close()
    print("[Reset] Successfully restored SentinelOS Security Lab to original vulnerable state.")


if __name__ == "__main__":
    reset_demo()
