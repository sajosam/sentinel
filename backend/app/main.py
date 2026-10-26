import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.db.session import engine, Base
from app.api.api_v1 import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sentinelos")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SentinelOS local database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("SentinelOS Security Engine initialized and ready.")
    yield
    logger.info("SentinelOS shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Local-first autonomous AI security platform for developers using AI coding tools.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API endpoints under /api
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/")
def root():
    return {
        "platform": "SentinelOS",
        "tagline": "Build with AI. Stay in control.",
        "status": "operational",
        "docs_url": "/docs"
    }
