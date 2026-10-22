from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.database import get_db
from app.models.user import User
from app.models.item import LostItem, FoundItem
from app.models.match import Match
from app.schemas.match import MatchStatusUpdateRequest, MatchResponse
from app.services.auth_service import get_current_user

from app.services.provenance import (
    is_seed_demo_lost,
    is_seed_demo_found,
    is_seed_demo_match,
)

router = APIRouter(prefix="/api", tags=["Matches"])

def serialize_match(match: Match) -> dict:
    lost = match.lost_item
    found = match.found_item

    lost_dict = None
    if lost:
        lost_dict = {
            "id": lost.lost_item_id,
            "item_name": lost.item_name,
            "category": lost.category,
            "location": lost.location_lost,
            "date": lost.date_lost,
            "image_url": lost.image_url,
            "status": lost.status,
            "user_id": lost.user_id,
        }

    found_dict = None
    if found:
        found_dict = {
            "id": found.found_item_id,
            "item_name": found.item_name,
            "category": found.category,
            "location": found.location_found,
            "custody_location": found.custody_location,
            "date": found.date_found,
            "image_url": found.image_url,
            "status": found.status,
            "user_id": found.user_id,
        }

    return {
        "match_id": match.match_id,
        "lost_item_id": match.lost_item_id,
        "found_item_id": match.found_item_id,
        "score": match.score,
        "confidence_level": match.confidence_level,
        "match_reason": match.match_reason,
        "status": match.status,
        "created_at": match.created_at,
        "lost_item": lost_dict,
        "found_item": found_dict,
    }

from app.services.matching_engine import run_matching_for_lost_item, run_matching_for_found_item, reconcile_all_matches

@router.get("/matches/my-matches")
def get_my_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns automated matches associated with the current user's lost or found items."""
    matches = (
        db.query(Match)
        .join(LostItem, Match.lost_item_id == LostItem.lost_item_id)
        .join(FoundItem, Match.found_item_id == FoundItem.found_item_id)
        .filter(or_(LostItem.user_id == current_user.user_id, FoundItem.user_id == current_user.user_id))
        .filter(Match.status != "RESOLVED")
        .order_by(desc(Match.score), desc(Match.created_at))
        .all()
    )
    return [serialize_match(m) for m in matches]

@router.post("/matches/reconcile")
def trigger_match_reconciliation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Controlled reconciliation mechanism that scans all active lost items and available
    found items in MySQL, creates missing matches, updates scores, and returns results.
    """
    result = reconcile_all_matches(db)
    reconciled_count = result.get("new_matches_created", 0) + result.get("matches_updated", 0)
    return {
        "status": "success",
        "message": "Match reconciliation completed successfully.",
        "reconciled_count": reconciled_count,
        **result
    }

@router.get("/lost-items/{item_id}/matches")
def get_lost_item_matches(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns matches computed for a specific lost item, evaluating on demand if not yet computed."""
    item = db.query(LostItem).filter(LostItem.lost_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item not found.")
    
    matches = db.query(Match).filter(Match.lost_item_id == item_id, Match.status != "RESOLVED").order_by(desc(Match.score)).all()
    if not matches and item.status in ("ACTIVE", "POTENTIAL_MATCH"):
        matches = run_matching_for_lost_item(db, item)

    return [serialize_match(m) for m in matches]

@router.get("/found-items/{item_id}/matches")
def get_found_item_matches(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns matches computed for a specific found item, evaluating on demand if not yet computed."""
    item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Found item not found.")

    matches = db.query(Match).filter(Match.found_item_id == item_id, Match.status != "RESOLVED").order_by(desc(Match.score)).all()
    if not matches and item.status in ("AVAILABLE", "POTENTIAL_MATCH"):
        matches = run_matching_for_found_item(db, item)

    return [serialize_match(m) for m in matches]

@router.patch("/matches/{match_id}/status")
def update_match_status(
    match_id: int,
    payload: MatchStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates a match status (e.g. ACCEPTED, REJECTED, RESOLVED)."""
    match = db.query(Match).filter(Match.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match record not found.")

    # Check permission: participant or admin
    lost = match.lost_item
    found = match.found_item
    is_participant = (lost and lost.user_id == current_user.user_id) or (found and found.user_id == current_user.user_id)
    if not (is_participant or current_user.role == "ADMIN"):
        raise HTTPException(status_code=403, detail="Unauthorized to update this match.")

    match.status = payload.status
    db.commit()
    db.refresh(match)
    return serialize_match(match)
