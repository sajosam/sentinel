import os
import shutil
from pathlib import Path
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
    
    # Meta Model API (OpenAI-compatible). Model IDs verified against GET /v1/models.
    PROD_MODEL_PROVIDER: str = "meta"
    PROD_MODEL_BASE_URL: str = "https://api.meta.ai/v1"
    PROD_MODEL_API_KEY: str = ""
    META_API_KEY: str = ""
    PROD_PLANNING_MODEL: str = "muse-spark-1.3"      # Muse Spark: investigation planning, summaries
    PROD_REASONING_MODEL: str = "muse-wonder-1.0"    # Muse Wonder: ThreatLens, exploit planning, interpretation
    PROD_CODE_MODEL: str = "muse-wonder-1.0"         # Muse Wonder: patch drafting (Muse Code has no API model)
    PROD_FAST_MODEL: str = "muse-spark-1.3"          # Muse Spark: discovery / fast tasks
    PROD_VISION_MODEL: str = "sam-3.1"               # SAM 3.1 (Responses API only; not wired)
    PROD_IMAGE_MODEL: str = "muse-image-1.0"         # Muse Image (Responses/Images API only; not wired)

    # Legacy / direct override fallbacks
    MODEL_PROVIDER: Optional[str] = None
    MODEL_BASE_URL: Optional[str] = None
    MODEL_API_KEY: Optional[str] = None
    MODEL_NAME: Optional[str] = None
    MODEL_TIMEOUT_SECONDS: int = 120  # Muse models reason before answering
    MODEL_MAX_RETRIES: int = 2
    
    # Scanner Paths (Auto-discovered across macOS Homebrew, Linux, and Docker)
    GITLEAKS_PATH: str = shutil.which("gitleaks") or "/opt/homebrew/bin/gitleaks"
    SEMGREP_PATH: str = shutil.which("semgrep") or "/opt/homebrew/bin/semgrep"
    OSV_SCANNER_PATH: str = shutil.which("osv-scanner") or "/opt/homebrew/bin/osv-scanner"

    
    # Where public repositories cloned via /api/workspaces/clone are stored (default: ~/.sentinelos/repos)
    CLONE_ROOT: str = ""

    # Investigation limits
    MAX_GRAPH_STEPS: int = 12
    MAX_TOOL_CALLS: int = 10
    PER_TOOL_SECONDS: int = 45
    PER_TOOL_TIMEOUT_SECONDS: int = 45
    MAX_INVESTIGATION_DURATION_SECONDS: int = 300
    
    # Security Token for local API protection
    LOCAL_API_SECRET: str = "sentinel-local-dev-token"

    model_config = SettingsConfigDict(
        # Repo-root .env first so the backend finds it from any cwd; a cwd .env overrides it
        env_file=(str(Path(__file__).resolve().parents[2] / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def active_env(self) -> str:
        return "prod"

    @property
    def active_provider(self) -> str:
        return (self.MODEL_PROVIDER or self.PROD_MODEL_PROVIDER).lower()

    @property
    def active_base_url(self) -> str:
        return self.MODEL_BASE_URL or self.PROD_MODEL_BASE_URL

    @property
    def active_api_key(self) -> str:
        return self.MODEL_API_KEY or self.PROD_MODEL_API_KEY or self.META_API_KEY or os.environ.get("META_API_KEY", "")

    def get_model_for_task(self, task_type: str = "general") -> str:
        """Returns the Meta model for a pipeline task (planning, reasoning, code, fast, vision, image)."""
        if self.MODEL_NAME:
            return self.MODEL_NAME

        t = task_type.lower()
        if t in ["planning", "summary", "report", "orchestration"]:
            return self.PROD_PLANNING_MODEL
        if t in ["reasoning", "attack_path", "threatlens", "interpretation"]:
            return self.PROD_REASONING_MODEL
        if t in ["remediation", "code", "patch", "verification"]:
            return self.PROD_CODE_MODEL
        if t in ["discovery", "fast", "local"]:
            return self.PROD_FAST_MODEL
        if t in ["vision", "masking"]:
            return self.PROD_VISION_MODEL
        if t in ["image", "diagram"]:
            return self.PROD_IMAGE_MODEL
        return self.PROD_PLANNING_MODEL

    def get_gateway_summary(self) -> dict:
        return {
            "deploy_env": self.active_env,
            "active_provider": self.active_provider,
            "active_base_url": self.active_base_url,
            "is_prod": True,
            "models": {
                "planning": self.get_model_for_task("planning"),
                "reasoning": self.get_model_for_task("reasoning"),
                "remediation": self.get_model_for_task("remediation"),
                "discovery": self.get_model_for_task("discovery"),
                "vision": self.get_model_for_task("vision"),
                "image": self.get_model_for_task("image"),
            },
            "prod_config": {
                "provider": self.PROD_MODEL_PROVIDER,
                "base_url": self.PROD_MODEL_BASE_URL,
                "planning_model": self.PROD_PLANNING_MODEL,
                "reasoning_model": self.PROD_REASONING_MODEL,
                "code_model": self.PROD_CODE_MODEL,
                "fast_model": self.PROD_FAST_MODEL,
                "vision_model": self.PROD_VISION_MODEL,
                "image_model": self.PROD_IMAGE_MODEL,
            }
        }


settings = Settings()


def get_demo_lab_dir() -> Path:
    if os.environ.get("DEMO_LAB_DIR"):
        return Path(os.environ["DEMO_LAB_DIR"]).resolve()
    for candidate in [
        Path.cwd() / "demo_lab",
        Path(__file__).resolve().parent.parent.parent / "demo_lab",
        Path(__file__).resolve().parent.parent / "demo_lab",
        Path("/app/demo_lab"),
    ]:
        if (candidate / "reset.py").exists():
            return candidate.resolve()
    return (Path(__file__).resolve().parent.parent.parent / "demo_lab").resolve()

