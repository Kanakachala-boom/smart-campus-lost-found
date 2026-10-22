import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError
from app.config import CORS_ORIGINS, UPLOAD_DIR
from app.database import init_db, check_db_connection
from app.routers import (
    auth,
    items,
    claims,
    matches,
    notifications,
    messages,
    dashboard,
    admin,
    verification,
    reclaim,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("smart_campus")

import asyncio
import os

async def periodic_retention_worker():
    """Background recurring task that cleans up expired handover records periodically."""
    # Check interval in seconds (default 86400s / 24 hours)
    interval_seconds = int(os.getenv("RETENTION_CHECK_INTERVAL_SECONDS", "86400"))
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            from app.database import SessionLocal
            from app.services.retention_service import cleanup_expired_handover_records
            with SessionLocal() as db:
                retention_summary = cleanup_expired_handover_records(db)
                logger.info(
                    f"[Retention Worker] Scheduled 6-month retention task completed: "
                    f"{retention_summary.get('status')} (Processed: {retention_summary.get('cleaned_count', 0)})"
                )
        except asyncio.CancelledError:
            logger.info("[Retention Worker] Recurring task received shutdown signal.")
            break
        except Exception as e:
            logger.error(f"[Retention Worker] Unexpected error during recurring execution: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Smart Campus Lost & Found System Backend...")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    is_connected, err = check_db_connection()
    if is_connected:
        logger.info("Database connection established successfully.")
        # Automatic scheduled retention audit on startup
        try:
            from app.database import SessionLocal
            from app.services.retention_service import cleanup_expired_handover_records
            with SessionLocal() as db:
                retention_summary = cleanup_expired_handover_records(db)
                logger.info(f"Automated 6-month retention verification: {retention_summary.get('status')} (Processed: {retention_summary.get('cleaned_count', 0)})")
        except Exception as ret_err:
            logger.warning(f"Startup retention check notice: {ret_err}")
    else:
        logger.warning(f"Database connection check returned: {err}")

    # Start recurring background retention task
    retention_bg_task = asyncio.create_task(periodic_retention_worker())

    yield

    # Shutdown actions: cancel background worker cleanly
    logger.info("Shutting down Smart Campus Backend...")
    retention_bg_task.cancel()
    try:
        await retention_bg_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Smart Campus Lost & Found System API",
    version="1.0.0",
    description="Centralized REST API for The National Institute of Engineering (NIE), Mysuru.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy.exc import (
    SQLAlchemyError,
    OperationalError,
    IntegrityError,
    DataError,
)

# Exception handlers ensuring clean JSON responses with CORS headers on database/server errors
@app.exception_handler(OperationalError)
async def operational_exception_handler(request: Request, exc: OperationalError):
    logger.error(f"Database operational/connection error during {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database connection error. Please verify that MySQL is running and database credentials in backend/.env are configured.",
            "error_type": "DatabaseConnectionError",
        },
    )

@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    logger.error(f"Database constraint error during {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": "Data constraint error: the submitted information conflicts with an existing record.",
            "error_type": "DatabaseIntegrityError",
        },
    )

@app.exception_handler(DataError)
async def data_exception_handler(request: Request, exc: DataError):
    logger.error(f"Database data formatting error during {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": "Data formatting error: one or more fields contain invalid values or exceed database limits.",
            "error_type": "DatabaseDataError",
        },
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error during {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "A database error occurred while processing the request. Please try again later.",
            "error_type": "DatabaseError",
        },
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception during {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected server error occurred. Please check backend server logs.",
            "error_type": "InternalServerError",
        },
    )

# Mount static directory for uploaded item photos
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Health Check & Root Endpoints
@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    """System health check endpoint verifying server operational status and MySQL connectivity."""
    db_connected, db_error = check_db_connection()
    return {
        "status": "healthy" if db_connected else "degraded",
        "service": "Smart Campus Lost & Found API",
        "institution": "The National Institute of Engineering (NIE), Mysuru",
        "database": {
            "connected": db_connected,
            "error": db_error,
        },
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to Smart Campus Lost & Found Management System API",
        "institution": "The National Institute of Engineering (NIE), Mysuru",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }

# Register API Routers
app.include_router(auth.router)
app.include_router(items.router)
app.include_router(claims.router)
app.include_router(matches.router)
app.include_router(notifications.router)
app.include_router(messages.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(verification.router)
app.include_router(reclaim.router)

if __name__ == "__main__":
    import uvicorn
    from app.config import HOST, PORT
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
