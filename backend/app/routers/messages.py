from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_, func
from app.database import get_db
from app.models.user import User
from app.models.claim import Claim
from app.models.item import FoundItem, LostItem
from app.models.match import Match
from app.models.message import ClaimMessage, Message
from app.models.notification import Notification
from app.schemas.message import MessageCreateRequest, MessageResponse, ConversationSummary
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["Messages"])

def serialize_message(msg: ClaimMessage) -> dict:
    sender = msg.sender
    receiver = msg.receiver
    sent_time = msg.sent_at if hasattr(msg, "sent_at") and msg.sent_at else getattr(msg, "created_at", None)
    iso_time = sent_time.isoformat() if sent_time else None
    display_time = sent_time.strftime("%Y-%m-%d %H:%M:%S") if sent_time else None

    # Classify channel type: admin support vs student peer
    is_admin_msg = (sender and sender.role == "ADMIN") or (receiver and receiver.role == "ADMIN")
    channel_type = "admin" if is_admin_msg else "student"

    claim_info = None
    if msg.claim:
        claim_info = {
            "claim_id": msg.claim.claim_id,
            "status": msg.claim.status,
            "found_item_id": msg.claim.found_item_id,
            "item_name": msg.claim.found_item.item_name if msg.claim.found_item else None,
        }

    return {
        "message_id": msg.message_id,
        "claim_id": msg.claim_id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "sender_name": sender.name if sender else "User",
        "sender_role": sender.role if sender else "STUDENT",
        "receiver_name": receiver.name if receiver else "User",
        "receiver_role": receiver.role if receiver else "STUDENT",
        "channel_type": channel_type,
        "claim": claim_info,
        "text": msg.text,
        "message": msg.text,
        "message_text": msg.text,
        "sent_at": iso_time,
        "created_at": display_time or iso_time,
        "is_read": bool(msg.is_read),
    }

# =========================================================================
# 1. Direct Private Messaging Endpoints (/api/messages)
# =========================================================================

@router.get("/messages/conversations")
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves all student conversation threads for the authenticated user.
    Aggregates messages by the other user, showing last message and unread count.
    """
    uid = current_user.user_id
    messages = (
        db.query(Message)
        .filter(or_(Message.sender_id == uid, Message.receiver_id == uid))
        .order_by(desc(Message.sent_at))
        .all()
    )

    threads: Dict[int, Dict[str, Any]] = {}
    for m in messages:
        other_id = m.receiver_id if m.sender_id == uid else m.sender_id
        if other_id not in threads:
            other_user = db.query(User).filter(User.user_id == other_id).first()
            if not other_user or other_user.role == "ADMIN":
                continue
            sent_time = m.sent_at.isoformat() if m.sent_at else None

            claim_info = None
            if m.claim:
                claim_info = {
                    "claim_id": m.claim.claim_id,
                    "item_name": m.claim.found_item.item_name if m.claim.found_item else None,
                    "found_item_id": m.claim.found_item_id,
                }

            threads[other_id] = {
                "other_user_id": other_id,
                "other_user_name": other_user.name,
                "other_user_role": other_user.role,
                "current_user_name": current_user.name,
                "current_user_role": current_user.role,
                "channel_type": "student",
                "last_message": m.text,
                "last_message_at": sent_time,
                "claim_id": m.claim_id,
                "claim": claim_info,
                "unread_count": 0,
            }

        # Calculate unread messages directed to current_user
        if other_id in threads and m.receiver_id == uid and not m.is_read:
            threads[other_id]["unread_count"] += 1

    return list(threads.values())

@router.get("/messages/conversation/{other_user_id}")
def get_user_conversation(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves private conversation history between current user and specified recipient.
    Marks received messages as read.
    """
    other_user = db.query(User).filter(User.user_id == other_user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified recipient user does not exist.",
        )

    uid = current_user.user_id
    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == uid, Message.receiver_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.receiver_id == uid),
            )
        )
        .order_by(Message.sent_at)
        .all()
    )

    # Mark all incoming messages from other_user as read
    updated = False
    for m in messages:
        if m.receiver_id == uid and not m.is_read:
            m.is_read = True
            updated = True
    if updated:
        db.commit()

    return [serialize_message(m) for m in messages]

@router.post("/messages", status_code=status.HTTP_201_CREATED)
def send_private_message(
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sends a private message to an authorized recipient.
    Sender identity is strictly derived from the authenticated JWT token (never trusted from body).
    Persists message in MySQL and issues targeted notification to recipient.
    """
    clean_text = (payload.text or "").strip()
    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message text cannot be empty.",
        )

    if len(clean_text) > 2000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message text exceeds maximum length of 2000 characters.",
        )

    recipient_id = payload.receiver_id
    if not recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient user ID is required.",
        )

    if recipient_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send a private message to yourself.",
        )

    recipient = db.query(User).filter(User.user_id == recipient_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found.",
        )

    # Optional claim validation if claim_id is attached
    if payload.claim_id:
        claim = db.query(Claim).filter(Claim.claim_id == payload.claim_id).first()
        if not claim:
            raise HTTPException(status_code=404, detail="Referenced claim not found.")
        found_item = claim.found_item
        is_claimant = claim.claimant_user_id == current_user.user_id
        is_finder = found_item and found_item.user_id == current_user.user_id
        is_admin = current_user.role == "ADMIN"
        if not (is_claimant or is_finder or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to send messages on this claim.",
            )

    new_msg = Message(
        sender_id=current_user.user_id,
        receiver_id=recipient_id,
        claim_id=payload.claim_id,
        message=clean_text,
        is_read=False,
    )
    db.add(new_msg)

    # Create targeted in-app notification for the recipient
    target_url = f"/claims/{payload.claim_id}/chat" if payload.claim_id else "/my-claims"
    notif = Notification(
        user_id=recipient_id,
        type="CLAIM_MESSAGE" if payload.claim_id else "NEW_MESSAGE",
        title=f"New Message from {current_user.name}",
        message=f"{current_user.name}: {clean_text[:60]}",
        reference_id=payload.claim_id,
        target_url=target_url,
        is_read=False,
    )
    db.add(notif)

    db.commit()
    db.refresh(new_msg)
    return serialize_message(new_msg)

@router.patch("/messages/{message_id}/read")
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marks a specific private message as read by its recipient."""
    msg = db.query(Message).filter(Message.message_id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    if msg.receiver_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized to mark another user's message as read.",
        )

    msg.is_read = True
    db.commit()
    db.refresh(msg)
    return serialize_message(msg)

# =========================================================================
# 2. Claim-Anchored Messaging Endpoints (/api/claims/{claim_id}/messages)
# =========================================================================

@router.get("/claims/{claim_id}/messages")
def get_claim_messages(
    claim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves in-app chat messages for a specific claim.
    Access is strictly restricted to the claimant, found item reporter, or administrators.
    Marks received messages as read.
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

    # Mark incoming messages as read for current user
    updated = False
    for m in messages:
        if m.receiver_id == current_user.user_id and not m.is_read:
            m.is_read = True
            updated = True
    if updated:
        db.commit()

    return [serialize_message(m) for m in messages]

@router.post("/claims/{claim_id}/messages", status_code=status.HTTP_201_CREATED)
def send_claim_message(
    claim_id: int,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sends a private message anchored to a specific claim.
    Sender identity derived strictly from JWT.
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
            detail="You are not authorized to send messages on this claim.",
        )

    text_clean = (payload.text or "").strip()
    if not text_clean:
        raise HTTPException(status_code=400, detail="Message text cannot be empty.")

    if len(text_clean) > 2000:
        raise HTTPException(status_code=400, detail="Message text exceeds 2000 characters.")

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
        is_read=False,
    )
    db.add(new_msg)

    if recipient_id and recipient_id != current_user.user_id:
        notif = Notification(
            user_id=recipient_id,
            type="CLAIM_MESSAGE",
            title="New Message on Item Claim",
            message=f"{current_user.name}: {text_clean[:60]}...",
            item_id=claim.claim_id,
            item_type="claim",
            target_url=f"/claims/{claim.claim_id}/chat",
            is_read=False,
        )
        db.add(notif)

    db.commit()
    db.refresh(new_msg)
    return serialize_message(new_msg)

# =========================================================================
# 3. Found-Item In-Report Conversation Endpoints
# =========================================================================

@router.get("/found-items/{item_id}/conversation")
def get_found_item_conversation(
    item_id: int,
    claim_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the private conversation inside a specific found-item report.
    Authorized participants:
    1. Found item reporter (finder)
    2. Authenticated user who submitted active claim
    3. Authenticated user who reported a lost item with matching record
    4. Administrator
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
        # Mark incoming as read
        updated = False
        for m in messages:
            if m.receiver_id == current_user.user_id and not m.is_read:
                m.is_read = True
                updated = True
        if updated:
            db.commit()

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
    Immediately notifies recipient. Sender identity derived strictly from JWT.
    """
    found_item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not found_item:
        raise HTTPException(status_code=404, detail="Found item report not found.")

    text_clean = (payload.text or "").strip()
    if not text_clean:
        raise HTTPException(status_code=400, detail="Message text cannot be empty.")

    if len(text_clean) > 2000:
        raise HTTPException(status_code=400, detail="Message text exceeds 2000 characters.")

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
        is_read=False,
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
