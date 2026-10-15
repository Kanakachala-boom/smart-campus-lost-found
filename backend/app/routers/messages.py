
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/messages", tags=["Private Messages"])

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-development-secret",
)
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class MessageCreate(BaseModel):
    receiver_id: int = Field(gt=0)
    message_text: str = Field(min_length=1, max_length=5000)


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


@router.post("", status_code=201)
def send_message(
    data: MessageCreate,
    sender_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if sender_id == data.receiver_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot send a message to yourself",
        )

    receiver = db.execute(
        text("SELECT user_id FROM users WHERE user_id = :uid"),
        {"uid": data.receiver_id},
    ).first()

    if not receiver:
        raise HTTPException(
            status_code=404,
            detail="Recipient not found",
        )

    result = db.execute(
        text("""
            INSERT INTO messages (sender_id, receiver_id, message_text)
            VALUES (:sender, :receiver, :content)
        """),
        {
            "sender": sender_id,
            "receiver": data.receiver_id,
            "content": data.message_text,
        },
    )

    db.commit()

    return {
        "message": "Message sent successfully",
        "message_id": result.lastrowid,
    }


@router.get("/conversation/{other_user_id}")
def get_conversation(
    other_user_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if other_user_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid conversation user",
        )

    other_user = db.execute(
        text("SELECT user_id FROM users WHERE user_id = :uid"),
        {"uid": other_user_id},
    ).first()

    if not other_user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    rows = db.execute(
        text("""
            SELECT message_id, sender_id, receiver_id,
                   message_text, sent_at
            FROM messages
            WHERE
                (sender_id = :me AND receiver_id = :other)
                OR
                (sender_id = :other AND receiver_id = :me)
            ORDER BY sent_at ASC, message_id ASC
        """),
        {"me": user_id, "other": other_user_id},
    ).mappings().all()

    return [dict(row) for row in rows]


@router.get("/conversations")
def get_my_conversations(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                u.user_id AS other_user_id,
                u.name AS other_user_name,
                MAX(m.sent_at) AS last_message_at
            FROM messages m
            JOIN users u
              ON u.user_id = CASE
                    WHEN m.sender_id = :uid THEN m.receiver_id
                    ELSE m.sender_id
                 END
            WHERE m.sender_id = :uid OR m.receiver_id = :uid
            GROUP BY u.user_id, u.name
            ORDER BY last_message_at DESC
        """),
        {"uid": user_id},
    ).mappings().all()

    return [dict(row) for row in rows]
