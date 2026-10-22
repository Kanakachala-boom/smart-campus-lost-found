from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.database import get_db
from app.models.user import User
from app.models.claim import Claim
from app.models.item import LostItem, FoundItem
from app.models.reclaim import ReclaimRecord
from app.services.auth_service import get_current_user

router = APIRouter(tags=["Reclaim Records"])

class ReclaimFinalizeRequest(BaseModel):
    handover_location: Optional[str] = "Campus Security Desk"
    remarks: Optional[str] = None

def _create_reclaim_handler(claim_id: int, payload: ReclaimFinalizeRequest, current_user: User, db: Session):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can finalize a reclaim.",
        )

    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    if claim.status != "VERIFIED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only verified claims can be finalized into a reclaim record.",
        )

    # Check existing reclaim for this claim
    existing = db.query(ReclaimRecord).filter(ReclaimRecord.claim_id == claim_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A reclaim record already exists for this claim.",
        )

    found = claim.found_item
    lost_id = claim.match.lost_id if claim.match else None
    if not lost_id:
        # Fallback to first active lost item reported by claimant in same category if available
        lost_cand = db.query(LostItem).filter(
            LostItem.user_id == claim.claimant_id,
            LostItem.category == found.category
        ).first()
        lost_id = lost_cand.lost_id if lost_cand else 1  # Safe reference

    owner_id = claim.claimant_id
    finder_id = found.user_id if found else current_user.user_id

    reclaim = ReclaimRecord(
        claim_id=claim_id,
        lost_id=lost_id,
        found_id=claim.found_id,
        owner_id=owner_id,
        finder_id=finder_id,
        reclaim_date=datetime.now(timezone.utc),
        handover_location=payload.handover_location,
        status="COMPLETED",
        remarks=payload.remarks,
    )
    db.add(reclaim)

    # Update item statuses
    if found:
        found.status = "RETURNED"
    if lost_id:
        lost_item = db.query(LostItem).filter(LostItem.lost_id == lost_id).first()
        if lost_item:
            lost_item.status = "RECLAIMED"

    db.commit()
    db.refresh(reclaim)

    return {
        "message": "Reclaim finalized successfully.",
        "reclaim_id": reclaim.reclaim_id,
        "claim_id": claim_id,
        "reclaimed_by": owner_id,
        "status": "COMPLETED",
    }

def _get_my_reclaims_handler(current_user: User, db: Session):
    rows = db.query(ReclaimRecord).filter(
        or_(ReclaimRecord.owner_id == current_user.user_id, ReclaimRecord.finder_id == current_user.user_id)
    ).order_by(desc(ReclaimRecord.reclaim_date)).all()
    return [
        {
            "reclaim_id": r.reclaim_id,
            "claim_id": r.claim_id,
            "lost_id": r.lost_id,
            "found_id": r.found_id,
            "owner_id": r.owner_id,
            "finder_id": r.finder_id,
            "reclaim_date": r.reclaim_date,
            "handover_location": r.handover_location,
            "status": r.status,
            "remarks": r.remarks,
        }
        for r in rows
    ]

def _get_all_reclaims_handler(current_user: User, db: Session):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view all reclaim records.",
        )
    rows = db.query(ReclaimRecord).order_by(desc(ReclaimRecord.reclaim_date)).all()
    return [
        {
            "reclaim_id": r.reclaim_id,
            "claim_id": r.claim_id,
            "lost_id": r.lost_id,
            "found_id": r.found_id,
            "owner_id": r.owner_id,
            "finder_id": r.finder_id,
            "reclaim_date": r.reclaim_date,
            "handover_location": r.handover_location,
            "status": r.status,
            "remarks": r.remarks,
        }
        for r in rows
    ]

@router.post("/api/reclaim-records/{claim_id}", status_code=status.HTTP_201_CREATED)
@router.post("/reclaim-records/{claim_id}", status_code=status.HTTP_201_CREATED)
def create_reclaim_record(claim_id: int, payload: ReclaimFinalizeRequest = ReclaimFinalizeRequest(), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _create_reclaim_handler(claim_id, payload, current_user, db)

@router.get("/api/reclaim-records/mine")
@router.get("/reclaim-records/mine")
def get_my_reclaim_records(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_my_reclaims_handler(current_user, db)

@router.get("/api/reclaim-records")
@router.get("/reclaim-records")
def get_all_reclaim_records(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_all_reclaims_handler(current_user, db)
