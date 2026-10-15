from fastapi.middleware.cors import CORSMiddleware
from app.routers.auth import router as auth_router
from fastapi import FastAPI
from sqlalchemy import text
from app.routers.items import router as items_router
from app.database import engine
from app.routers.claims import router as claims_router
from app.routers.verification import router as verification_router
from app.routers.reclaim import router as reclaim_router
from app.routers.notifications import router as notifications_router
from app.routers.messages import router as messages_router
from app.routers.admin import router as admin_router
from app.routers import dashboard

app = FastAPI(
    title="Smart Campus Lost & Found System",
    description="API for the NIE Mysuru campus lost and found application.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(items_router)
app.include_router(claims_router)
app.include_router(verification_router)
app.include_router(reclaim_router)
app.include_router(notifications_router)
app.include_router(messages_router)
app.include_router(admin_router)
app.include_router(dashboard.router)

@app.get("/")
def root():
    return {
        "message": "Smart Campus Lost & Found API is running",
        "status": "success",
    }


@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
        }
    except Exception:
        return {
            "status": "unhealthy",
            "database": "disconnected",
        }
