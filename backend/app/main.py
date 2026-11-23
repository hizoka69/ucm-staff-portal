import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.db import close_pool, get_connection, init_pool
from app.routers import (
    auth_router,
    gestores_router,
    mantenedores_router,
    reportes_router,
)

logger = logging.getLogger("ucm_staff_api")

IS_PROD = os.getenv("ENV", "development").lower() == "production"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_pool()
    yield
    close_pool()


app = FastAPI(
    title="UCM Staff API",
    description="Backend FastAPI + Oracle 21c PL/SQL para Gestión de Staff Universitario UCM",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if IS_PROD:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# CORSMiddleware va después del middleware HTTP para quedar como capa externa
# y responder correctamente los preflight OPTIONS
cors_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,https://staff.ucm.cl",
)
allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=(
        None
        if IS_PROD
        else r"^http://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):5173$"
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Intenta nuevamente."},
    )


UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
(UPLOADS_DIR / "avatars").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(auth_router.router)
app.include_router(mantenedores_router.router)
app.include_router(gestores_router.router)
app.include_router(reportes_router.router)


@app.get("/api/health", tags=["Sistema"])
def health():
    with get_connection() as conn:
        with conn.cursor() as cur:
            if IS_PROD:
                cur.execute("SELECT 1 FROM dual")
                cur.fetchone()
                return {"status": "ok"}

            cur.execute("SELECT banner FROM v$version FETCH FIRST 1 ROWS ONLY")
            version = cur.fetchone()[0]
            return {"status": "ok", "oracle": version}