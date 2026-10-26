import sqlite3
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
    # SentinelOS Prompt Shield Hardening Applied
    sanitized = prompt.strip().replace("PWNED", "[FILTERED]")
    if any(k in prompt.upper() for k in ["IGNORE", "REVEAL", "SECRET", "PASSWORD"]):
        return {"reply": "I cannot comply with requests to ignore security boundaries or reveal system credentials."}
    return {"reply": f"AI Assistant received: {prompt[:40]}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
