
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/claims", tags=["Claims"])

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-development-secret"
)
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class ClaimCreate(BaseModel):
    match_id: int = Field(gt=0)


class ClaimReview(BaseModel):
    status: str


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
        text(
            "SELECT user_id, role FROM users WHERE user_id = :uid"
        ),
        {"uid": user_id},
    ).mappings().first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return dict(user)


@router.post("", status_code=201)
def create_claim(
    data: ClaimCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    match = db.execute(
        text("SELECT * FROM matches WHERE match_id = :mid"),
        {"mid": data.match_id},
    ).mappings().first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    existing = db.execute(
        text("""
            SELECT claim_id
            FROM claims
            WHERE match_id = :mid AND claimant_id = :uid
        """),
        {"mid": data.match_id, "uid": user["user_id"]},
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already submitted a claim for this match",
        )

    result = db.execute(
        text("""
            INSERT INTO claims
                (match_id, claimant_id, verification_status)
            VALUES
                (:mid, :uid, 'PENDING')
        """),
        {"mid": data.match_id, "uid": user["user_id"]},
    )

    db.commit()

    return {
        "message": "Claim submitted successfully",
        "claim_id": result.lastrowid,
        "verification_status": "PENDING",
    }


@router.get("/mine")
def get_my_claims(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    claims = db.execute(
        text("""
            SELECT claim_id, match_id, verification_score,
                   verification_status
            FROM claims
            WHERE claimant_id = :uid
            ORDER BY claim_id DESC
        """),
        {"uid": user["user_id"]},
    ).mappings().all()

    return [dict(claim) for claim in claims]


@router.get("/{claim_id}")
def get_claim(
    claim_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    claim = db.execute(
        text("""
            SELECT claim_id, match_id, claimant_id,
                   verification_score, verification_status
            FROM claims
            WHERE claim_id = :cid
        """),
        {"cid": claim_id},
    ).mappings().first()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    if (
        claim["claimant_id"] != user["user_id"]
        and user["role"] != "ADMIN"
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    return dict(claim)


@router.patch("/{claim_id}/review")
def review_claim(
    claim_id: int,
    data: ClaimReview,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can review claims",
        )

    status = data.status.upper()

    if status not in {"APPROVED", "REJECTED"}:
        raise HTTPException(
            status_code=400,
            detail="Status must be APPROVED or REJECTED",
        )

    result = db.execute(
        text("""
            UPDATE claims
            SET verification_status = :status
            WHERE claim_id = :cid
        """),
        {"status": status, "cid": claim_id},
    )

    if result.rowcount == 0:
        db.rollback()
        raise HTTPException(status_code=404, detail="Claim not found")

    db.commit()

    return {
        "message": "Claim reviewed successfully",
        "claim_id": claim_id,
        "verification_status": status,
    }
