from sqlalchemy.orm import Session
from app.models.notification import Notification

def create_notification(
    db: Session,
    user_id: int,
    notif_type: str,
    title: str,
    message: str,
    item_id: int | None = None,
    item_type: str | None = None,
    target_url: str | None = None,
) -> Notification:
    """Creates a user-specific notification and persists it in the database."""
    notification = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        item_id=item_id,
        item_type=item_type,
        target_url=target_url,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
