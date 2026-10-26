import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "SentinelOS Security Service"
    API_PREFIX: str = "/api"
    ENV: str = "development"
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    
    # Storage
    DATABASE_URL: str = "sqlite:///./sentinel.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "tauri://localhost",
        "http://tauri.localhost"
    ]
    
    # AI Model Gateway Configuration
    MODEL_PROVIDER: str = "meta"  # meta, openai, ollama, mock
    MODEL_BASE_URL: str = "https://api.groq.com/openai/v1"
    MODEL_API_KEY: str = ""
    MODEL_NAME: str = "llama-3.3-70b-versatile"
    MODEL_TIMEOUT_SECONDS: int = 60
    MODEL_MAX_RETRIES: int = 2
    
    # Scanner Paths (Auto-discovered or customized)
    GITLEAKS_PATH: str = "/opt/homebrew/bin/gitleaks"
    SEMGREP_PATH: str = "/opt/homebrew/bin/semgrep"
    OSV_SCANNER_PATH: str = "/opt/homebrew/bin/osv-scanner"
    
    # Investigation limits
    MAX_GRAPH_STEPS: int = 12
    MAX_TOOL_CALLS: int = 10
    PER_TOOL_TIMEOUT_SECONDS: int = 45
    MAX_INVESTIGATION_DURATION_SECONDS: int = 300
    
    # Security Token for local API protection
    LOCAL_API_SECRET: str = "sentinel-local-dev-token"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
