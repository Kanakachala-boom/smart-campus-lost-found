from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.user import User
from app.models.item import FoundItem, LostItem
from app.models.claim import Claim
from app.models.notification import Notification
from app.schemas.claim import ClaimCreateRequest, ClaimVerifyRequest, ClaimResponse
from app.services.auth_service import get_current_user
from app.services.provenance import is_seed_demo_found, is_seed_demo_claim
from app.services.matching_engine import resolve_matches_for_item

router = APIRouter(prefix="/api", tags=["Claims"])

def serialize_claim(claim: Claim) -> dict:
    found_item = claim.found_item
    item_dict = None
    if found_item:
        item_dict = {
            "id": found_item.found_item_id,
            "user_id": found_item.user_id,
            "item_name": found_item.item_name,
            "category": found_item.category,
            "location": found_item.location_found,
            "date": found_item.date_found,
            "image_url": found_item.image_url,
            "status": found_item.status,
            "custody_location": found_item.custody_location,
        }

    return {
        "claim_id": claim.claim_id,
        "found_item_id": claim.found_item_id,
        "claimant_user_id": claim.claimant_user_id,
        "claimant_name": claim.claimant.name if claim.claimant else "Student",
        "status": claim.status,
        "verification_details": claim.verification_details,
        "lost_date": claim.lost_date,
        "lost_location": claim.lost_location,
        "claimant_answer": claim.claimant_answer,
        "proof_image_url": claim.proof_image_url,
        "handover_instructions": claim.handover_instructions,
        "rejection_reason": claim.rejection_reason,
        "reviewed_at": claim.reviewed_at,
        "created_at": claim.created_at,
        "found_item": item_dict,
    }

@router.post("/claims", status_code=status.HTTP_201_CREATED)
def submit_claim(
    payload: ClaimCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submits an ownership claim with private identifying verification details."""
    found_item = db.query(FoundItem).filter(FoundItem.found_item_id == payload.found_item_id).first()
    if not found_item or is_seed_demo_found(found_item):
        raise HTTPException(status_code=404, detail="Found item not found.")
    
    # Check if user is trying to claim their own found report
    if found_item.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot submit an ownership claim for an item you reported found.",
        )

    # Check for existing pending claim by this user
    existing_claim = db.query(Claim).filter(
        Claim.found_item_id == payload.found_item_id,
        Claim.claimant_user_id == current_user.user_id,
        Claim.status == "PENDING"
    ).first()
    if existing_claim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active pending claim for this item.",
        )

    new_claim = Claim(
        found_item_id=payload.found_item_id,
        claimant_user_id=current_user.user_id,
        verification_details=payload.verification_details.strip(),
        lost_date=payload.lost_date,
        lost_location=payload.lost_location.strip() if payload.lost_location else None,
        claimant_answer=payload.claimant_answer.strip() if payload.claimant_answer else None,
        proof_image_url=payload.proof_image_url,
        status="PENDING",
    )
    db.add(new_claim)

    # Update item status to CLAIMED
    found_item.status = "CLAIMED"

    # Send targeted notification to the found item reporter
    finder_notif = Notification(
        user_id=found_item.user_id,
        type="CLAIM_SUBMITTED",
        title="Claim Submitted on Found Item",
        message=f"An ownership claim has been submitted for '{found_item.item_name}'. Campus authorities are reviewing verification marks.",
        item_id=found_item.found_item_id,
        item_type="found",
        target_url="/my-reports",
        is_read=False,
    )
    db.add(finder_notif)

    # Send confirmation notification to the claimant
    claimant_notif = Notification(
        user_id=current_user.user_id,
        type="CLAIM_SUBMITTED",
        title="Ownership Claim Registered",
        message=f"Your claim for '{found_item.item_name}' was registered. You will be notified once authorities review the verification marks.",
        item_id=found_item.found_item_id,
        item_type="found",
        target_url="/my-claims",
        is_read=False,
    )
    db.add(claimant_notif)

    db.commit()
    db.refresh(new_claim)
    return serialize_claim(new_claim)

@router.get("/claims/my-claims")
def get_my_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all claims submitted by the current authenticated user."""
    claims = db.query(Claim).filter(Claim.claimant_user_id == current_user.user_id).order_by(desc(Claim.created_at)).all()
    return [serialize_claim(c) for c in claims if not is_seed_demo_claim(c)]

@router.get("/claims/{claim_id}")
def get_claim_by_id(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves claim details. Restricted to claimant, item reporter, or admin."""
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim or is_seed_demo_claim(claim):
        raise HTTPException(status_code=404, detail="Claim not found.")

    found_item = claim.found_item
    is_claimant = claim.claimant_user_id == current_user.user_id
    is_finder = found_item and found_item.user_id == current_user.user_id
    is_admin = current_user.role == "ADMIN"

    if not (is_claimant or is_finder or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this claim.",
        )

    return serialize_claim(claim)

@router.get("/found-items/{item_id}/verification-challenge")
def get_verification_challenge(item_id: int, db: Session = Depends(get_db)):
    """
    Returns security challenge prompts without exposing secret answers or private marks.
    Enforces privacy by never storing or returning expected answers.
    """
    item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not item or is_seed_demo_found(item):
        raise HTTPException(status_code=404, detail="Found item not found.")

    return {
        "found_item_id": item.found_item_id,
        "item_name": item.item_name,
        "category": item.category,
        "challenge_prompt": "Describe any unique identifying markings, serial numbers, case characteristics, or internal contents to verify ownership.",
    }

@router.post("/claims/{claim_id}/verify")
def verify_claim(
    claim_id: int,
    payload: ClaimVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verifies or rejects a claim. Admin or authorized staff/finder only."""
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    found_item = claim.found_item
    is_admin = current_user.role == "ADMIN"
    is_finder = found_item and found_item.user_id == current_user.user_id

    if not (is_admin or is_finder):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to verify this claim.",
        )

    new_status = payload.status.upper()
    if new_status not in ("VERIFIED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Status must be either VERIFIED or REJECTED.")

    claim.status = new_status
    claim.reviewed_at = datetime.now(timezone.utc)

    if new_status == "VERIFIED":
        claim.handover_instructions = payload.handover_instructions or "Please visit campus security with your NIE ID for handover."
        
        # Link matched lost item if exists for the claimant
        from app.models.match import Match
        from app.models.reclaim import ReclaimRecord
        
        matched_lost = None
        if found_item:
            found_item.status = "RETURNED"
            resolve_matches_for_item(db, "found", found_item.found_item_id)
            
            matched_match = (
                db.query(Match)
                .join(LostItem, Match.lost_item_id == LostItem.lost_id)
                .filter(
                    Match.found_item_id == found_item.found_item_id,
                    LostItem.user_id == claim.claimant_user_id
                )
                .first()
            )
            if matched_match and matched_match.lost_item:
                matched_lost = matched_match.lost_item
                matched_lost.status = "RESOLVED"
                resolve_matches_for_item(db, "lost", matched_lost.lost_id)

        # Persist structured 6-month handover history record
        reclaim_entry = ReclaimRecord(
            claim_id=claim.claim_id,
            lost_id=matched_lost.lost_id if matched_lost else None,
            found_id=found_item.found_item_id if found_item else 0,
            owner_id=claim.claimant_user_id,
            finder_id=found_item.user_id if found_item else current_user.user_id,
            reclaim_date=datetime.now(timezone.utc),
            handover_location=claim.handover_instructions or payload.handover_instructions or "Campus Lost & Found Office",
            status="COMPLETED",
            remarks=f"Verified and approved by {current_user.name} ({current_user.role})"
        )
        db.add(reclaim_entry)

        # Notify claimant via in-app notification
        notif = Notification(
            user_id=claim.claimant_user_id,
            type="CLAIM_VERIFIED",
            title="Ownership Claim Verified",
            message=f"Your claim for '{found_item.item_name if found_item else 'Item'}' has been approved! {claim.handover_instructions}",
            item_id=claim.found_item_id,
            item_type="found",
            target_url=f"/claims/{claim.claim_id}",
            is_read=False,
        )
        db.add(notif)

        # Dispatch email & SMS alerts to claimant
        claimant = db.query(User).filter(User.user_id == claim.claimant_user_id).first()
        if claimant:
            try:
                from app.services.email_service import send_claim_alert_email, send_handover_complete_email
                from app.services.sms_service import send_sms_notification
                send_claim_alert_email(
                    to_email=claimant.email,
                    recipient_name=claimant.name,
                    item_title=found_item.item_name if found_item else "Item",
                    claim_id=claim.claim_id,
                    status="VERIFIED",
                    notes=claim.handover_instructions
                )
                send_handover_complete_email(
                    to_email=claimant.email,
                    recipient_name=claimant.name,
                    item_title=found_item.item_name if found_item else "Item",
                    handover_location=claim.handover_instructions
                )
                if claimant.phone:
                    send_sms_notification(
                        phone_number=claimant.phone,
                        message=f"[NIE L&F] Claim #{claim.claim_id} verified for '{found_item.item_name if found_item else 'Item'}'. Handover approved."
                    )
            except Exception:
                pass
    else:
        claim.rejection_reason = payload.rejection_reason or "Verification details did not match the item specifications."
        if found_item:
            found_item.status = "AVAILABLE"

        notif = Notification(
            user_id=claim.claimant_user_id,
            type="CLAIM_REJECTED",
            title="Claim Verification Update",
            message=f"Your claim for '{found_item.item_name if found_item else 'Item'}' could not be verified: {claim.rejection_reason}",
            item_id=claim.found_item_id,
            item_type="found",
            target_url=f"/claims/{claim.claim_id}",
            is_read=False,
        )
        db.add(notif)

        claimant = db.query(User).filter(User.user_id == claim.claimant_user_id).first()
        if claimant:
            try:
                from app.services.email_service import send_claim_alert_email
                send_claim_alert_email(
                    to_email=claimant.email,
                    recipient_name=claimant.name,
                    item_title=found_item.item_name if found_item else "Item",
                    claim_id=claim.claim_id,
                    status="REJECTED",
                    notes=claim.rejection_reason
                )
            except Exception:
                pass

    db.commit()
    db.refresh(claim)
    return {"message": f"Claim status updated to {new_status}.", "data": serialize_claim(claim)}


@router.get("/found-items/{item_id}/claims")
def get_found_item_claims(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves all claims submitted for a found item.
    Restricted to the finder who reported it or an administrator.
    """
    found_item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item not found.")

    is_finder = found_item.user_id == current_user.user_id
    is_admin = current_user.role == "ADMIN"

    if not (is_finder or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to view claims for this item.",
        )

    claims = (
        db.query(Claim)
        .filter(Claim.found_item_id == item_id)
        .order_by(desc(Claim.created_at))
        .all()
    )
    return [serialize_claim(c) for c in claims]

