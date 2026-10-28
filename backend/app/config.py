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
    
    # Deployment Environment: "demo" (Groq inference) vs "prod" (Meta Model API)
    DEPLOY_ENV: str = "demo"  # "demo" | "prod"

    # 1. Demo Mode Configuration (Groq Provider for ultra-fast Llama inference)
    DEMO_MODEL_PROVIDER: str = "groq"
    DEMO_MODEL_BASE_URL: str = "https://api.groq.com/openai/v1"
    DEMO_MODEL_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    DEMO_PLANNING_MODEL: str = "llama-3.3-70b-versatile"
    DEMO_REASONING_MODEL: str = "llama-3.3-70b-versatile"
    DEMO_CODE_MODEL: str = "llama-3.3-70b-versatile"
    DEMO_FAST_MODEL: str = "llama-3.1-8b-instant"

    # 2. Production Mode Configuration (Native Meta Models & Providers)
    PROD_MODEL_PROVIDER: str = "meta"
    PROD_MODEL_BASE_URL: str = "https://api.meta.ai/v1"
    PROD_MODEL_API_KEY: str = ""
    META_API_KEY: str = ""
    PROD_PLANNING_MODEL: str = "muse-spark"          # Meta Muse Spark Series
    PROD_REASONING_MODEL: str = "muse-wonder"        # Meta Muse Wonder (ThreatLens)
    PROD_CODE_MODEL: str = "muse-code"              # Meta Muse Code (Patch Remediation)
    PROD_FAST_MODEL: str = "muse-spark-open"         # Meta Muse Spark Open / Glimmer
    PROD_VISION_MODEL: str = "sam-3.1"               # Meta SAM 3.1 & Muse Image

    # Legacy / direct override fallbacks
    MODEL_PROVIDER: Optional[str] = None
    MODEL_BASE_URL: Optional[str] = None
    MODEL_API_KEY: Optional[str] = None
    MODEL_NAME: Optional[str] = None
    MODEL_TIMEOUT_SECONDS: int = 60
    MODEL_MAX_RETRIES: int = 2
    
    # Scanner Paths (Auto-discovered or customized)
    GITLEAKS_PATH: str = "/opt/homebrew/bin/gitleaks"
    SEMGREP_PATH: str = "/opt/homebrew/bin/semgrep"
    OSV_SCANNER_PATH: str = "/opt/homebrew/bin/osv-scanner"
    
    # Investigation limits
    MAX_GRAPH_STEPS: int = 12
    MAX_TOOL_CALLS: int = 10
    PER_TOOL_SECONDS: int = 45
    PER_TOOL_TIMEOUT_SECONDS: int = 45
    MAX_INVESTIGATION_DURATION_SECONDS: int = 300
    
    # Security Token for local API protection
    LOCAL_API_SECRET: str = "sentinel-local-dev-token"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def is_prod(self) -> bool:
        return self.DEPLOY_ENV.lower() in ["prod", "production"]

    @property
    def active_env(self) -> str:
        return "prod" if self.is_prod else "demo"

    @property
    def active_provider(self) -> str:
        if self.MODEL_PROVIDER:
            return self.MODEL_PROVIDER.lower()
        return self.PROD_MODEL_PROVIDER if self.is_prod else self.DEMO_MODEL_PROVIDER

    @property
    def active_base_url(self) -> str:
        if self.MODEL_BASE_URL:
            return self.MODEL_BASE_URL
        return self.PROD_MODEL_BASE_URL if self.is_prod else self.DEMO_MODEL_BASE_URL

    @property
    def active_api_key(self) -> str:
        if self.MODEL_API_KEY:
            return self.MODEL_API_KEY
        if self.is_prod:
            return self.PROD_MODEL_API_KEY or self.META_API_KEY or os.environ.get("META_API_KEY", "")
        return self.DEMO_MODEL_API_KEY or self.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")

    def get_model_for_task(self, task_type: str = "general") -> str:
        """
        Returns the appropriate model name depending on DEPLOY_ENV (demo vs prod)
        and specific pipeline task (planning, reasoning, code, fast, vision).
        """
        if self.MODEL_NAME:
            return self.MODEL_NAME

        t = task_type.lower()
        if self.is_prod:
            if t in ["planning", "summary", "report", "orchestration"]:
                return self.PROD_PLANNING_MODEL
            if t in ["reasoning", "attack_path", "threatlens", "interpretation"]:
                return self.PROD_REASONING_MODEL
            if t in ["remediation", "code", "patch", "verification"]:
                return self.PROD_CODE_MODEL
            if t in ["discovery", "fast", "local"]:
                return self.PROD_FAST_MODEL
            if t in ["vision", "image", "diagram", "masking"]:
                return self.PROD_VISION_MODEL
            return self.PROD_PLANNING_MODEL
        else:
            # Demo Mode (Groq Llama models)
            if t in ["discovery", "fast", "local"]:
                return self.DEMO_FAST_MODEL
            if t in ["vision", "image", "diagram"]:
                return "llama-3.2-11b-vision-preview"
            return self.DEMO_PLANNING_MODEL

    def get_gateway_summary(self) -> dict:
        return {
            "deploy_env": self.active_env,
            "active_provider": self.active_provider,
            "active_base_url": self.active_base_url,
            "is_prod": self.is_prod,
            "models": {
                "planning": self.get_model_for_task("planning"),
                "reasoning": self.get_model_for_task("reasoning"),
                "remediation": self.get_model_for_task("remediation"),
                "discovery": self.get_model_for_task("discovery"),
                "vision": self.get_model_for_task("vision"),
            },
            "demo_config": {
                "provider": self.DEMO_MODEL_PROVIDER,
                "base_url": self.DEMO_MODEL_BASE_URL,
                "planning_model": self.DEMO_PLANNING_MODEL,
                "reasoning_model": self.DEMO_REASONING_MODEL,
                "code_model": self.DEMO_CODE_MODEL,
                "fast_model": self.DEMO_FAST_MODEL,
            },
            "prod_config": {
                "provider": self.PROD_MODEL_PROVIDER,
                "base_url": self.PROD_MODEL_BASE_URL,
                "planning_model": self.PROD_PLANNING_MODEL,
                "reasoning_model": self.PROD_REASONING_MODEL,
                "code_model": self.PROD_CODE_MODEL,
                "fast_model": self.PROD_FAST_MODEL,
                "vision_model": self.PROD_VISION_MODEL,
            }
        }


settings = Settings()

