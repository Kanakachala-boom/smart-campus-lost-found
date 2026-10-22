from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services.auth_service import get_current_user
from app.services.provenance import is_seed_demo_notification

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    CRITICAL PRIVACY INVARIANT:
    Retrieves user-specific notifications strictly belonging to the authenticated recipient.
    Global broadcasting is prohibited.
    """
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.user_id)
        .order_by(desc(Notification.created_at))
        .all()
    )
    return [n for n in notifs if not is_seed_demo_notification(n)]

@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the unread notification count for the current user."""
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.user_id, Notification.is_read == False)
        .all()
    )
    real_count = len([n for n in notifs if not is_seed_demo_notification(n)])
    return UnreadCountResponse(unread_count=real_count)

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marks a single notification as read, enforcing user ownership."""
    notif = (
        db.query(Notification)
        .filter(Notification.notification_id == notification_id, Notification.user_id == current_user.user_id)
        .first()
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied.",
        )

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marks all notifications for the current authenticated user as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"success": True}
