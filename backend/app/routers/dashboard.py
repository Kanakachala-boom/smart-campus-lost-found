
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import os

from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-development-secret"
)
ALGORITHM = "HS256"


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.execute(
        text("""
            SELECT user_id, name, email, role
            FROM users
            WHERE user_id = :user_id
        """),
        {"user_id": user_id}
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return dict(user)


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["user_id"]

    active_lost = db.execute(
        text("""
            SELECT COUNT(*)
            FROM lost_items
            WHERE user_id = :user_id
              AND UPPER(status) IN ('ACTIVE', 'OPEN', 'LOST')
        """),
        {"user_id": user_id}
    ).scalar() or 0

    active_found = db.execute(
        text("""
            SELECT COUNT(*)
            FROM found_items
            WHERE user_id = :user_id
              AND UPPER(status) IN ('ACTIVE', 'OPEN', 'FOUND')
        """),
        {"user_id": user_id}
    ).scalar() or 0

    pending_claims = db.execute(
        text("""
            SELECT COUNT(*)
            FROM claims
            WHERE claimant_id = :user_id
              AND UPPER(verification_status) = 'PENDING'
        """),
        {"user_id": user_id}
    ).scalar() or 0

    unread_notifications = db.execute(
        text("""
            SELECT COUNT(*)
            FROM notifications
            WHERE user_id = :user_id
              AND is_read = 0
        """),
        {"user_id": user_id}
    ).scalar() or 0

    potential_matches = db.execute(
        text("""
            SELECT COUNT(DISTINCT m.match_id)
            FROM matches m
            LEFT JOIN lost_items l ON l.lost_id = m.lost_id
            LEFT JOIN found_items f ON f.found_id = m.found_id
            WHERE (l.user_id = :user_id OR f.user_id = :user_id)
              AND UPPER(m.status) IN ('PENDING', 'POTENTIAL', 'NEW')
        """),
        {"user_id": user_id}
    ).scalar() or 0

    recent_lost = db.execute(
        text("""
            SELECT
                lost_id AS item_id,
                item_name,
                category,
                location,
                status,
                created_at,
                'lost' AS report_type
            FROM lost_items
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT 5
        """),
        {"user_id": user_id}
    ).mappings().all()

    recent_found = db.execute(
        text("""
            SELECT
                found_id AS item_id,
                category,
                description AS item_name,
                location,
                status,
                created_at,
                'found' AS report_type
            FROM found_items
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT 5
        """),
        {"user_id": user_id}
    ).mappings().all()

    recent_reports = [
        dict(row) for row in recent_lost
    ] + [
        dict(row) for row in recent_found
    ]

    recent_reports.sort(
        key=lambda row: row["created_at"],
        reverse=True
    )
    recent_reports = recent_reports[:5]

    recent_claims = db.execute(
        text("""
            SELECT
                c.claim_id,
                c.match_id,
                c.verification_score,
                c.verification_status,
                c.created_at,
                m.lost_id,
                m.found_id
            FROM claims c
            LEFT JOIN matches m ON m.match_id = c.match_id
            WHERE c.claimant_id = :user_id
            ORDER BY c.created_at DESC
            LIMIT 5
        """),
        {"user_id": user_id}
    ).mappings().all()

    return {
        "user": user,
        "metrics": {
            "activeLost": active_lost,
            "activeFound": active_found,
            "pendingClaims": pending_claims,
            "potentialMatches": potential_matches,
            "unreadNotifications": unread_notifications
        },
        "recentReports": recent_reports,
        "recentClaims": [
            dict(row) for row in recent_claims
        ]
    }
