from fastapi import APIRouter
from app.api.endpoints import (
    workspaces,
    investigations,
    findings,
    policies,
    shield,
    attack_paths,
    remediation,
    audit,
    tools,
    health,
    demo,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(workspaces.router)
api_router.include_router(investigations.router)
api_router.include_router(findings.router)
api_router.include_router(policies.router)
api_router.include_router(shield.router)
api_router.include_router(attack_paths.router)
api_router.include_router(remediation.router)
api_router.include_router(audit.router)
api_router.include_router(tools.router)
api_router.include_router(demo.router)
