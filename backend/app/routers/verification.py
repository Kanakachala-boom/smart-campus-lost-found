
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(
    prefix="/ownership-verifications",
    tags=["Ownership Verification"],
)

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-development-secret",
)
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class VerificationCreate(BaseModel):
    claim_id: int = Field(gt=0)
    question: str = Field(min_length=5, max_length=2000)
    expected_answer: str = Field(min_length=1, max_length=255)


class VerificationAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=255)


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


@router.post("", status_code=201)
def create_verification(
    data: VerificationCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can create verification questions",
        )

    claim = db.execute(
        text("""
            SELECT claim_id
            FROM claims
            WHERE claim_id = :cid
        """),
        {"cid": data.claim_id},
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    result = db.execute(
        text("""
            INSERT INTO ownership_verifications
                (claim_id, question, expected_answer)
            VALUES
                (:cid, :question, :answer)
        """),
        {
            "cid": data.claim_id,
            "question": data.question,
            "answer": data.expected_answer,
        },
    )

    db.commit()

    return {
        "message": "Verification question created",
        "verification_id": result.lastrowid,
    }


@router.get("/claim/{claim_id}")
def get_verification_questions(
    claim_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    claim = db.execute(
        text("""
            SELECT claim_id, claimant_id
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

    rows = db.execute(
        text("""
            SELECT verification_id, question
            FROM ownership_verifications
            WHERE claim_id = :cid
            ORDER BY verification_id
        """),
        {"cid": claim_id},
    ).mappings().all()

    # Never return expected answers to the claimant.
    return [dict(row) for row in rows]


@router.post("/{verification_id}/answer")
def answer_verification(
    verification_id: int,
    data: VerificationAnswer,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("""
            SELECT ov.verification_id,
                   ov.claim_id,
                   ov.expected_answer,
                   c.claimant_id
            FROM ownership_verifications ov
            JOIN claims c ON c.claim_id = ov.claim_id
            WHERE ov.verification_id = :vid
        """),
        {"vid": verification_id},
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Verification question not found",
        )

    if row["claimant_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Compare normalized answers without returning the expected answer.
    correct = (
        data.answer.strip().casefold()
        == row["expected_answer"].strip().casefold()
    )

    return {
        "verification_id": verification_id,
        "correct": correct,
        "message": (
            "Answer accepted"
            if correct
            else "Answer does not match"
        ),
    }
