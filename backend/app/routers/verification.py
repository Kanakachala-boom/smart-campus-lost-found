from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.claim import Claim
from app.models.verification import OwnershipVerification
from app.services.auth_service import get_current_user

router = APIRouter(tags=["Ownership Verification"])

class VerificationCreate(BaseModel):
    claim_id: int = Field(gt=0)
    question: str = Field(min_length=5, max_length=2000)
    expected_answer: str = Field(min_length=1, max_length=255)

class VerificationAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=255)

def _create_verification_handler(data: VerificationCreate, current_user: User, db: Session):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create verification questions.",
        )
    claim = db.query(Claim).filter(Claim.claim_id == data.claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    v = OwnershipVerification(
        claim_id=data.claim_id,
        question=data.question.strip(),
        expected_answer=data.expected_answer.strip(),
        result="PENDING",
        verified_by=current_user.user_id,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {
        "message": "Verification question created successfully.",
        "verification_id": v.verification_id,
    }

def _get_verification_questions_handler(claim_id: int, current_user: User, db: Session):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    is_claimant = claim.claimant_id == current_user.user_id
    is_admin = current_user.role == "ADMIN"
    if not (is_claimant or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    questions = db.query(OwnershipVerification).filter(OwnershipVerification.claim_id == claim_id).all()
    # Shield expected_answer for non-admin claimants
    result = []
    for q in questions:
        item = {
            "verification_id": q.verification_id,
            "claim_id": q.claim_id,
            "question": q.question,
            "result": q.result,
        }
        if is_admin:
            item["expected_answer"] = q.expected_answer
            item["provided_answer"] = q.provided_answer
        result.append(item)
    return result

def _answer_verification_handler(verification_id: int, data: VerificationAnswer, current_user: User, db: Session):
    v = db.query(OwnershipVerification).filter(OwnershipVerification.verification_id == verification_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Verification question not found.")

    claim = v.claim
    if claim.claimant_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    provided = data.answer.strip()
    correct = (
        provided.casefold() == (v.expected_answer or "").strip().casefold()
        if v.expected_answer
        else True
    )

    v.provided_answer = provided
    v.result = "PASSED" if correct else "FAILED"
    v.verified_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "verification_id": verification_id,
        "correct": correct,
        "message": "Answer accepted" if correct else "Answer does not match",
    }

# Register both /api/ownership-verifications and /ownership-verifications for backwards compatibility
@router.post("/api/ownership-verifications", status_code=status.HTTP_201_CREATED)
@router.post("/ownership-verifications", status_code=status.HTTP_201_CREATED)
def create_verification(data: VerificationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _create_verification_handler(data, current_user, db)

@router.get("/api/ownership-verifications/claim/{claim_id}")
@router.get("/ownership-verifications/claim/{claim_id}")
def get_verification_questions(claim_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_verification_questions_handler(claim_id, current_user, db)

@router.post("/api/ownership-verifications/{verification_id}/answer")
@router.post("/ownership-verifications/{verification_id}/answer")
def answer_verification(verification_id: int, data: VerificationAnswer, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _answer_verification_handler(verification_id, data, current_user, db)
