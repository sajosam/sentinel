import shutil
from pathlib import Path
from fastapi import APIRouter
from app.config import settings
from app.core.model_gateway import model_gateway

router = APIRouter(tags=["Health & Readiness"])


@router.get("/health")
def health_check():
    gitleaks_ok = bool(shutil.which(settings.GITLEAKS_PATH) or Path(settings.GITLEAKS_PATH).exists())
    semgrep_ok = bool(shutil.which(settings.SEMGREP_PATH) or Path(settings.SEMGREP_PATH).exists())
    osv_ok = bool(shutil.which(settings.OSV_SCANNER_PATH) or Path(settings.OSV_SCANNER_PATH).exists())

    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.ENV,
        "scanners": {
            "gitleaks": {"installed": gitleaks_ok, "path": settings.GITLEAKS_PATH},
            "semgrep": {"installed": semgrep_ok, "path": settings.SEMGREP_PATH},
            "osv_scanner": {"installed": osv_ok, "path": settings.OSV_SCANNER_PATH},
        },
        "model_gateway": {
            "provider": settings.MODEL_PROVIDER,
            "model_name": settings.MODEL_NAME,
            "configured": model_gateway.is_configured(),
            "base_url": settings.MODEL_BASE_URL
        }
    }
