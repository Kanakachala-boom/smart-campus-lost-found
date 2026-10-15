
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/reclaim-records", tags=["Reclaim Records"])

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-development-secret",
)
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user = db.execute(
        text("SELECT user_id, role FROM users WHERE user_id = :uid"),
        {"uid": user_id},
    ).mappings().first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return dict(user)


@router.post("/{claim_id}", status_code=201)
def create_reclaim_record(
    claim_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can finalize a reclaim",
        )

    claim = db.execute(
        text("""
            SELECT c.claim_id, c.claimant_id, c.verification_status,
                   m.lost_id, m.found_id
            FROM claims c
            JOIN matches m ON m.match_id = c.match_id
            WHERE c.claim_id = :cid
        """),
        {"cid": claim_id},
    ).mappings().first()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim or match not found")

    if claim["verification_status"] != "APPROVED":
        raise HTTPException(
            status_code=400,
            detail="Only approved claims can be finalized",
        )

    existing = db.execute(
        text("""
            SELECT record_id
            FROM reclaim_records
            WHERE (lost_id = :lost_id AND :lost_id IS NOT NULL)
               OR (found_id = :found_id AND :found_id IS NOT NULL)
        """),
        {
            "lost_id": claim["lost_id"],
            "found_id": claim["found_id"],
        },
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A reclaim record already exists for this item",
        )

    try:
        db.execute(
            text("""
                INSERT INTO reclaim_records
                    (lost_id, found_id, user_id)
                VALUES
                    (:lost_id, :found_id, :user_id)
            """),
            {
                "lost_id": claim["lost_id"],
                "found_id": claim["found_id"],
                "user_id": claim["claimant_id"],
            },
        )

        if claim["lost_id"] is not None:
            db.execute(
                text("""
                    UPDATE lost_items
                    SET status = 'RECOVERED'
                    WHERE lost_id = :item_id
                """),
                {"item_id": claim["lost_id"]},
            )

        if claim["found_id"] is not None:
            db.execute(
                text("""
                    UPDATE found_items
                    SET status = 'RETURNED'
                    WHERE found_id = :item_id
                """),
                {"item_id": claim["found_id"]},
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Reclaim finalized successfully",
        "claim_id": claim_id,
        "reclaimed_by": claim["claimant_id"],
    }


@router.get("/mine")
def get_my_reclaim_records(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT record_id, lost_id, found_id, reclaimed_at
            FROM reclaim_records
            WHERE user_id = :uid
            ORDER BY reclaimed_at DESC
        """),
        {"uid": user["user_id"]},
    ).mappings().all()

    return [dict(row) for row in rows]


@router.get("")
def get_reclaim_records(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can view all reclaim records",
        )

    rows = db.execute(
        text("""
            SELECT record_id, lost_id, found_id, user_id, reclaimed_at
            FROM reclaim_records
            ORDER BY reclaimed_at DESC
        """)
    ).mappings().all()

    return [dict(row) for row in rows]
