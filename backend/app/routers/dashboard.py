from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.database import get_db
from app.models.user import User
from app.models.item import LostItem, FoundItem
from app.models.claim import Claim
from app.models.match import Match
from app.models.notification import Notification
from app.schemas.dashboard import UserDashboardResponse, UserDashboardMetrics
from app.services.auth_service import get_current_user

from app.services.provenance import (
    is_seed_demo_lost,
    is_seed_demo_found,
    is_seed_demo_match,
    is_seed_demo_claim,
    is_seed_demo_notification,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("", response_model=UserDashboardResponse)
def get_user_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculates personalized dashboard metrics and recent user activity."""
    uid = current_user.user_id

    # Active lost items belonging strictly to the logged-in user
    user_lost = [
        item for item in db.query(LostItem).filter(
            LostItem.user_id == uid,
            LostItem.status.in_(["ACTIVE", "POTENTIAL_MATCH"])
        ).all() if not is_seed_demo_lost(item)
    ]
    active_lost = len(user_lost)

    # Active found items belonging strictly to the logged-in user
    user_found = [
        item for item in db.query(FoundItem).filter(
            FoundItem.user_id == uid,
            FoundItem.status.in_(["AVAILABLE", "POTENTIAL_MATCH"])
        ).all() if not is_seed_demo_found(item)
    ]
    active_found = len(user_found)

    # Pending claims submitted strictly by the logged-in user
    user_claims = [
        c for c in db.query(Claim).filter(Claim.claimant_user_id == uid).all()
        if not is_seed_demo_claim(c)
    ]
    pending_claims = len([c for c in user_claims if c.status == "PENDING"])

    # Potential matches associated with the logged-in user's active/available reports
    # Counts the distinct active reports belonging to the user that have active candidate matches.
    # This ensures the potential match count never exceeds the user's active reported item count.
    user_lost_ids_with_matches = set(
        row[0] for row in (
            db.query(Match.lost_item_id)
            .join(LostItem, Match.lost_item_id == LostItem.lost_item_id)
            .join(FoundItem, Match.found_item_id == FoundItem.found_item_id)
            .filter(
                LostItem.user_id == uid,
                LostItem.status.in_(["ACTIVE", "POTENTIAL_MATCH"]),
                FoundItem.status.in_(["AVAILABLE", "POTENTIAL_MATCH"]),
                Match.status != "RESOLVED",
                Match.status != "REJECTED"
            )
            .all()
        )
    )

    user_found_ids_with_matches = set(
        row[0] for row in (
            db.query(Match.found_item_id)
            .join(LostItem, Match.lost_item_id == LostItem.lost_item_id)
            .join(FoundItem, Match.found_item_id == FoundItem.found_item_id)
            .filter(
                FoundItem.user_id == uid,
                LostItem.status.in_(["ACTIVE", "POTENTIAL_MATCH"]),
                FoundItem.status.in_(["AVAILABLE", "POTENTIAL_MATCH"]),
                Match.status != "RESOLVED",
                Match.status != "REJECTED"
            )
            .all()
        )
    )

    active_matched_lost = [
        lid for lid in user_lost_ids_with_matches
        if any(not is_seed_demo_match(m) for m in db.query(Match).filter(Match.lost_item_id == lid).all())
    ]
    active_matched_found = [
        fid for fid in user_found_ids_with_matches
        if any(not is_seed_demo_match(m) for m in db.query(Match).filter(Match.found_item_id == fid).all())
    ]

    potential_matches = len(active_matched_lost) + len(active_matched_found)

    # Unread notifications specific to the logged-in user
    notifs = db.query(Notification).filter(
        Notification.user_id == uid,
        Notification.is_read == False
    ).all()
    unread_notifs = len([n for n in notifs if not is_seed_demo_notification(n)])

    # Recent user reports (strictly belonging to logged-in user)
    all_recent_lost = [l for l in db.query(LostItem).filter(LostItem.user_id == uid).order_by(desc(LostItem.created_at)).all() if not is_seed_demo_lost(l)]
    all_recent_found = [f for f in db.query(FoundItem).filter(FoundItem.user_id == uid).order_by(desc(FoundItem.created_at)).all() if not is_seed_demo_found(f)]

    formatted_reports = []
    for l in all_recent_lost:
        formatted_reports.append({
            "id": l.lost_item_id,
            "lost_item_id": l.lost_item_id,
            "type": "lost",
            "item_name": l.item_name,
            "category": l.category,
            "location": l.location_lost,
            "location_lost": l.location_lost,
            "date": str(l.date_lost),
            "date_lost": str(l.date_lost),
            "status": l.status,
            "created_at": l.created_at.isoformat(),
        })
    for f in all_recent_found:
        formatted_reports.append({
            "id": f.found_item_id,
            "found_item_id": f.found_item_id,
            "type": "found",
            "item_name": f.item_name,
            "category": f.category,
            "location": f.location_found,
            "location_found": f.location_found,
            "date": str(f.date_found),
            "date_found": str(f.date_found),
            "status": f.status,
            "created_at": f.created_at.isoformat(),
        })

    # Combine user's reports, sort strictly by created_at descending, take top 5
    formatted_reports.sort(key=lambda x: x["created_at"], reverse=True)
    top_recent_reports = formatted_reports[:5]

    # Recent claims submitted by logged-in user
    recent_claims_list = [c for c in db.query(Claim).filter(Claim.claimant_user_id == uid).order_by(desc(Claim.created_at)).all() if not is_seed_demo_claim(c)][:5]
    formatted_claims = []
    for c in recent_claims_list:
        found_name = c.found_item.item_name if c.found_item else "Item"
        formatted_claims.append({
            "claim_id": c.claim_id,
            "found_item_id": c.found_item_id,
            "item_name": found_name,
            "found_item_name": found_name,
            "status": c.status,
            "created_at": c.created_at.isoformat(),
        })

    return UserDashboardResponse(
        metrics=UserDashboardMetrics(
            activeLost=active_lost,
            activeFound=active_found,
            pendingClaims=pending_claims,
            potentialMatches=potential_matches,
            unreadNotifications=unread_notifs,
        ),
        recentReports=top_recent_reports,
        recentClaims=formatted_claims,
    )
