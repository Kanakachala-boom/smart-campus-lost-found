from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.user import User
from app.models.item import LostItem, FoundItem
from app.models.claim import Claim
from app.models.match import Match
from app.schemas.dashboard import AdminDashboardResponse, AdminDashboardMetrics
from app.services.auth_service import get_current_admin
from app.routers.claims import serialize_claim
from app.routers.matches import serialize_match

from app.services.provenance import (
    is_seed_demo_lost,
    is_seed_demo_found,
    is_seed_demo_match,
    is_seed_demo_claim,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(get_current_admin)])

@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(db: Session = Depends(get_db)):
    """Computes campus-wide analytics and audit metrics."""
    all_lost = [l for l in db.query(LostItem).all() if not is_seed_demo_lost(l)]
    all_found = [f for f in db.query(FoundItem).all() if not is_seed_demo_found(f)]

    total_lost = len(all_lost)
    total_found = len(all_found)

    active_lost = len([l for l in all_lost if l.status in ("ACTIVE", "POTENTIAL_MATCH")])
    active_found = len([f for f in all_found if f.status in ("AVAILABLE", "POTENTIAL_MATCH")])

    returned_lost = len([l for l in all_lost if l.status == "RETURNED"])
    returned_found = len([f for f in all_found if f.status == "RETURNED"])
    returned_items = returned_lost + returned_found

    claimed_items = len([f for f in all_found if f.status == "CLAIMED"])

    claims = [c for c in db.query(Claim).all() if not is_seed_demo_claim(c)]
    pending_claims = len([c for c in claims if c.status == "PENDING"])
    verified_claims = len([c for c in claims if c.status == "VERIFIED"])
    rejected_claims = len([c for c in claims if c.status == "REJECTED"])

    total_reports = total_lost + total_found
    recovery_rate = int((returned_items / total_reports) * 100) if total_reports > 0 else 0

    return AdminDashboardResponse(
        metrics=AdminDashboardMetrics(
            totalLost=total_lost,
            totalFound=total_found,
            totalReports=total_reports,
            activeReports=active_lost + active_found,
            claimedItems=claimed_items,
            returnedItems=returned_items,
            pendingClaims=pending_claims,
            verifiedClaims=verified_claims,
            rejectedClaims=rejected_claims,
            recoveryRate=recovery_rate,
        )
    )

@router.get("/claims")
def get_admin_claims(db: Session = Depends(get_db)):
    """Returns all claims for administrative review."""
    claims = db.query(Claim).order_by(desc(Claim.created_at)).all()
    return [serialize_claim(c) for c in claims if not is_seed_demo_claim(c)]

@router.get("/items")
def get_admin_items(db: Session = Depends(get_db)):
    """Returns all reported items with identifying marks unveiled for authorized admin verification."""
    lost_items = [l for l in db.query(LostItem).order_by(desc(LostItem.created_at)).all() if not is_seed_demo_lost(l)]
    found_items = [f for f in db.query(FoundItem).order_by(desc(FoundItem.created_at)).all() if not is_seed_demo_found(f)]

    formatted_items = []
    for l in lost_items:
        formatted_items.append({
            "id": l.lost_item_id,
            "type": "lost",
            "item_name": l.item_name,
            "category": l.category,
            "location": l.location_lost,
            "date": str(l.date_lost),
            "status": l.status,
            "created_at": l.created_at.isoformat(),
            "user_id": l.user_id,
            "identifying_marks": l.identifying_marks,
        })

    for f in found_items:
        formatted_items.append({
            "id": f.found_item_id,
            "type": "found",
            "item_name": f.item_name,
            "category": f.category,
            "location": f.location_found,
            "custody_location": f.custody_location,
            "date": str(f.date_found),
            "status": f.status,
            "created_at": f.created_at.isoformat(),
            "user_id": f.user_id,
        })

    formatted_items.sort(key=lambda x: x["created_at"], reverse=True)
    return formatted_items

@router.get("/matches")
def get_admin_matches(db: Session = Depends(get_db)):
    """Returns all computed matches across campus."""
    matches = db.query(Match).order_by(desc(Match.score), desc(Match.created_at)).all()
    return [serialize_match(m) for m in matches if not is_seed_demo_match(m)]


@router.get("/retention/status")
def get_admin_retention_status(
    retention_days: int = 180,
    db: Session = Depends(get_db)
):
    """Retrieves 6-month handover history retention status and audit metrics."""
    from app.services.retention_service import get_retention_status
    return get_retention_status(db, retention_days=retention_days)


@router.post("/retention/cleanup")
def trigger_admin_retention_cleanup(
    retention_days: int = 180,
    anonymize: bool = False,
    db: Session = Depends(get_db)
):
    """
    Triggers idempotent cleanup of handover records exceeding the retention threshold (defaults to 180 days).
    Safe to retry and preserves active reports and user accounts.
    """
    from app.services.retention_service import cleanup_expired_handover_records
    result = cleanup_expired_handover_records(db, retention_days=retention_days, anonymize=anonymize)
    return result


@router.get("/reclaim-records")
def get_admin_reclaim_records(db: Session = Depends(get_db)):
    """Returns completed handover history stored in MySQL for 6-month audit compliance."""
    from app.models.reclaim import ReclaimRecord
    records = db.query(ReclaimRecord).order_by(desc(ReclaimRecord.reclaim_date)).all()
    return [
        {
            "reclaim_id": r.reclaim_id,
            "claim_id": r.claim_id,
            "lost_id": r.lost_id,
            "found_id": r.found_id,
            "owner_id": r.owner_id,
            "finder_id": r.finder_id,
            "reclaim_date": r.reclaim_date.isoformat() if r.reclaim_date else None,
            "handover_location": r.handover_location,
            "status": r.status,
            "remarks": r.remarks,
        }
        for r in records
    ]
