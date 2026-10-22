from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.user import User
from app.models.claim import Claim
from app.models.item import FoundItem, LostItem
from app.models.match import Match
from app.models.message import ClaimMessage
from app.models.notification import Notification
from app.schemas.message import MessageCreateRequest, MessageResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["Messages"])

def serialize_message(msg: ClaimMessage) -> dict:
    sender = msg.sender
    return {
        "message_id": msg.message_id,
        "claim_id": msg.claim_id,
        "sender_id": msg.sender_id,
        "sender_name": sender.name if sender else "User",
        "sender_role": sender.role if sender else "STUDENT",
        "text": msg.text,
        "created_at": msg.created_at,
    }

@router.get("/claims/{claim_id}/messages")
def get_claim_messages(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves in-app chat messages for a specific claim.
    Access is strictly restricted to the claimant, found item reporter, or administrators.
    """
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    found_item = claim.found_item
    is_claimant = claim.claimant_user_id == current_user.user_id
    is_finder = found_item and found_item.user_id == current_user.user_id
    is_admin = current_user.role == "ADMIN"

    if not (is_claimant or is_finder or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view messages for this claim.",
        )

    messages = (
        db.query(ClaimMessage)
        .filter(ClaimMessage.claim_id == claim_id)
        .order_by(ClaimMessage.sent_at)
        .all()
    )
    return [serialize_message(m) for m in messages]

@router.post("/claims/{claim_id}/messages", status_code=status.HTTP_201_CREATED)
def send_claim_message(
    claim_id: int,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sends a private message anchored to a specific claim."""
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found.")

    found_item = claim.found_item
    is_claimant = claim.claimant_user_id == current_user.user_id
    is_finder = found_item and found_item.user_id == current_user.user_id
    is_admin = current_user.role == "ADMIN"

    if not (is_claimant or is_finder or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to send messages on this claim.",
        )

    text_clean = payload.text.strip()
    if not text_clean:
        raise HTTPException(status_code=400, detail="Message text cannot be empty.")

    # Determine recipient for message and targeted notification
    recipient_id = None
    if is_claimant:
        recipient_id = found_item.user_id if found_item else None
    elif is_finder:
        recipient_id = claim.claimant_user_id
    elif is_admin:
        recipient_id = claim.claimant_user_id

    new_msg = ClaimMessage(
        claim_id=claim_id,
        sender_id=current_user.user_id,
        receiver_id=recipient_id or current_user.user_id,
        text=text_clean,
    )
    db.add(new_msg)
    
    if recipient_id and recipient_id != current_user.user_id:
        notif = Notification(
            user_id=recipient_id,
            type="CLAIM_MESSAGE",
            title="New Message on Item Claim",
            message=f"{current_user.name}: {text_clean[:60]}...",
            item_id=claim.found_item_id,
            item_type="found",
            target_url=f"/items/found/{claim.found_item_id}",
            is_read=False,
        )
        db.add(notif)

    db.commit()
    db.refresh(new_msg)
    return serialize_message(new_msg)

@router.get("/found-items/{item_id}/conversation")
def get_found_item_conversation(
    item_id: int,
    claim_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the private conversation inside a specific found-item report.
    Authorized participants are strictly:
    1. The reporter of the found item (finder)
    2. An authenticated user who submitted an active claim for this found item
    3. An authenticated user who reported a lost item that is a potential match with this found item
    4. An administrator
    Unrelated third users receive HTTP 403 Forbidden.
    """
    found_item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item report not found.")

    is_finder = found_item.user_id == current_user.user_id
    is_admin = current_user.role == "ADMIN"

    user_claim = db.query(Claim).filter(
        Claim.found_item_id == item_id,
        Claim.claimant_user_id == current_user.user_id
    ).first()

    user_match = (
        db.query(Match)
        .join(LostItem, Match.lost_item_id == LostItem.lost_id)
        .filter(
            Match.found_item_id == item_id,
            LostItem.user_id == current_user.user_id
        )
        .first()
    )

    if not (is_finder or is_admin or user_claim or user_match):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view the private conversation for this found item.",
        )

    target_claim = None
    all_claims = []

    if is_finder or is_admin:
        all_claims = db.query(Claim).filter(Claim.found_item_id == item_id).order_by(desc(Claim.created_at)).all()
        if claim_id:
            target_claim = db.query(Claim).filter(Claim.claim_id == claim_id, Claim.found_item_id == item_id).first()
        elif all_claims:
            target_claim = all_claims[0]
    else:
        if user_claim:
            target_claim = user_claim
        elif user_match:
            target_claim = Claim(
                found_item_id=found_item.found_item_id,
                claimant_user_id=current_user.user_id,
                match_id=user_match.match_id,
                verification_details=f"In-app coordination for potential match with '{user_match.lost_item.item_name}'",
                status="PENDING",
            )
            db.add(target_claim)
            if found_item.status == "AVAILABLE":
                found_item.status = "POTENTIAL_MATCH"
            db.commit()
            db.refresh(target_claim)

    messages = []
    if target_claim:
        messages = (
            db.query(ClaimMessage)
            .filter(ClaimMessage.claim_id == target_claim.claim_id)
            .order_by(ClaimMessage.sent_at)
            .all()
        )

    conversations_summary = [
        {
            "claim_id": c.claim_id,
            "claimant_id": c.claimant_user_id,
            "claimant_name": c.claimant.name if c.claimant else "Student",
            "status": c.status,
            "created_at": c.created_at,
        }
        for c in all_claims
    ]

    return {
        "can_chat": True,
        "found_item_id": item_id,
        "claim_id": target_claim.claim_id if target_claim else None,
        "finder_id": found_item.user_id,
        "finder_name": found_item.user.name if found_item.user else "Finder",
        "claimant_id": target_claim.claimant_user_id if target_claim else (current_user.user_id if not is_finder else None),
        "claimant_name": target_claim.claimant.name if (target_claim and target_claim.claimant) else (current_user.name if not is_finder else None),
        "is_finder": is_finder,
        "status": target_claim.status if target_claim else None,
        "messages": [serialize_message(m) for m in messages],
        "conversations": conversations_summary,
    }

@router.post("/found-items/{item_id}/conversation/messages", status_code=status.HTTP_201_CREATED)
def send_found_item_message(
    item_id: int,
    payload: MessageCreateRequest,
    claim_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sends a private message anchored to a specific found item report.
    The finder or authorized claimant can converse.
    Immediately notifies the recipient via targeted notification.
    Sender identity is strictly derived from the authenticated JWT.
    """
    found_item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item report not found.")

    text_clean = payload.text.strip() if payload.text else ""
    if not text_clean:
        raise HTTPException(status_code=400, detail="Message text cannot be empty.")

    is_finder = found_item.user_id == current_user.user_id
    is_admin = current_user.role == "ADMIN"

    user_claim = db.query(Claim).filter(
        Claim.found_item_id == item_id,
        Claim.claimant_user_id == current_user.user_id
    ).first()

    user_match = (
        db.query(Match)
        .join(LostItem, Match.lost_item_id == LostItem.lost_id)
        .filter(
            Match.found_item_id == item_id,
            LostItem.user_id == current_user.user_id
        )
        .first()
    )

    if not (is_finder or is_admin or user_claim or user_match):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to send messages regarding this found item.",
        )

    # Determine claim and recipient
    if is_finder or is_admin:
        if claim_id:
            claim = db.query(Claim).filter(Claim.claim_id == claim_id, Claim.found_item_id == item_id).first()
        else:
            claim = db.query(Claim).filter(Claim.found_item_id == item_id).order_by(desc(Claim.created_at)).first()

        if not claim:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No claimant conversation exists yet for this found item.",
            )
        recipient_id = claim.claimant_user_id
        recipient_title = f"Finder message on '{found_item.item_name}'"
    else:
        # Lost item owner / claimant
        if user_claim:
            claim = user_claim
        elif user_match:
            claim = Claim(
                found_item_id=found_item.found_item_id,
                claimant_user_id=current_user.user_id,
                match_id=user_match.match_id,
                verification_details=f"In-app coordination for potential match with '{user_match.lost_item.item_name}'",
                status="PENDING",
            )
            db.add(claim)
            if found_item.status == "AVAILABLE":
                found_item.status = "POTENTIAL_MATCH"
            db.commit()
            db.refresh(claim)
        else:
            raise HTTPException(status_code=403, detail="No authorized claim or match found.")

        recipient_id = found_item.user_id
        recipient_title = f"Message about your found '{found_item.item_name}'"

    new_msg = ClaimMessage(
        claim_id=claim.claim_id,
        sender_id=current_user.user_id,
        receiver_id=recipient_id,
        text=text_clean,
    )
    db.add(new_msg)

    # Prompt notification to the recipient, linking directly to the found item report
    if recipient_id and recipient_id != current_user.user_id:
        notif = Notification(
            user_id=recipient_id,
            type="CLAIM_MESSAGE",
            title=recipient_title,
            message=f"{current_user.name}: {text_clean[:60]}",
            item_id=found_item.found_item_id,
            item_type="found",
            target_url=f"/items/found/{found_item.found_item_id}",
            is_read=False,
        )
        db.add(notif)

    db.commit()
    db.refresh(new_msg)
    return serialize_message(new_msg)
