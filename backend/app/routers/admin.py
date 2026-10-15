
import os

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-development-secret",
)
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def require_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.execute(
        text("SELECT user_id, role FROM users WHERE user_id = :uid"),
        {"uid": user_id},
    ).mappings().first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    return user


@router.get("/dashboard")
def dashboard(
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    counts = {}

    queries = {
        "total_users": "SELECT COUNT(*) FROM users",
        "total_lost_items": "SELECT COUNT(*) FROM lost_items",
        "total_found_items": "SELECT COUNT(*) FROM found_items",
        "total_claims": "SELECT COUNT(*) FROM claims",
        "pending_claims": """
            SELECT COUNT(*) FROM claims
            WHERE verification_status = 'PENDING'
        """,
        "total_reclaims": "SELECT COUNT(*) FROM reclaim_records",
    }

    for key, sql in queries.items():
        counts[key] = db.execute(text(sql)).scalar_one()

    return counts


@router.get("/users")
def list_users(
    search: str | None = Query(default=None, max_length=150),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    sql = """
        SELECT user_id, name, email, role, created_at
        FROM users
    """
    params = {"limit": limit, "offset": offset}

    if search:
        sql += " WHERE name LIKE :search OR email LIKE :search"
        params["search"] = f"%{search}%"

    sql += " ORDER BY user_id DESC LIMIT :limit OFFSET :offset"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(row) for row in rows]


@router.get("/claims")
def list_claims(
    status: str | None = Query(default=None),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    sql = """
        SELECT claim_id, match_id, claimant_id,
               verification_score, verification_status
        FROM claims
    """
    params = {}

    if status:
        status = status.upper()
        if status not in {"PENDING", "APPROVED", "REJECTED"}:
            raise HTTPException(status_code=400, detail="Invalid claim status")
        sql += " WHERE verification_status = :status"
        params["status"] = status

    sql += " ORDER BY claim_id DESC"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(row) for row in rows]
