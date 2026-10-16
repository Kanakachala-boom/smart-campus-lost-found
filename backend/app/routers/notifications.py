
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/notifications", tags=["Notifications"])

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-development-secret",
)
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user = db.execute(
        text("SELECT user_id FROM users WHERE user_id = :uid"),
        {"uid": user_id},
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user_id


@router.get("")
def get_my_notifications(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT *
            FROM notifications
            WHERE user_id = :uid
            ORDER BY notification_id DESC
        """),
        {"uid": user_id},
    ).mappings().all()

    return [dict(row) for row in rows]


@router.get("/unread-count")
def get_unread_count(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT *
            FROM notifications
            WHERE user_id = :uid
        """),
        {"uid": user_id},
    ).mappings().all()

    # Determine unread state from the columns available in the table.
    if not rows:
        return {"unread_count": 0}

    first = dict(rows[0])

    if "is_read" in first:
        count = sum(not bool(row["is_read"]) for row in rows)
    elif "read_status" in first:
        count = sum(
            str(row["read_status"]).upper() in {"UNREAD", "FALSE", "0"}
            for row in rows
        )
    else:
        raise HTTPException(
            status_code=500,
            detail="Notifications table needs a recognized read-status column",
        )

    return {"unread_count": count}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    columns = db.execute(
        text("SHOW COLUMNS FROM notifications")
    ).mappings().all()

    column_names = {column["Field"] for column in columns}

    if "is_read" in column_names:
        update_sql = """
            UPDATE notifications
            SET is_read = 1
            WHERE notification_id = :nid AND user_id = :uid
        """
    elif "read_status" in column_names:
        update_sql = """
            UPDATE notifications
            SET read_status = 'READ'
            WHERE notification_id = :nid AND user_id = :uid
        """
    else:
        raise HTTPException(
            status_code=500,
            detail="No recognized read-status column found",
        )

    result = db.execute(
        text(update_sql),
        {"nid": notification_id, "uid": user_id},
    )

    if result.rowcount == 0:
        db.rollback()
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    db.commit()

    return {"message": "Notification marked as read"}


@router.patch("/read-all")
def mark_all_notifications_read(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    columns = db.execute(
        text("SHOW COLUMNS FROM notifications")
    ).mappings().all()

    column_names = {column["Field"] for column in columns}

    if "is_read" in column_names:
        update_sql = """
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = :uid AND is_read = 0
        """
    elif "read_status" in column_names:
        update_sql = """
            UPDATE notifications
            SET read_status = 'READ'
            WHERE user_id = :uid AND read_status = 'UNREAD'
        """
    else:
        raise HTTPException(
            status_code=500,
            detail="No recognized read-status column found",
        )

    result = db.execute(update_sql, {"uid": user_id})
    db.commit()

    return {
        "message": "All notifications marked as read",
        "updated_count": result.rowcount,
    }
