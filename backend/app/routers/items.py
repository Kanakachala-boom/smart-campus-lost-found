
from datetime import date, time
import os

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.items import LostItemCreate, FoundItemCreate


router = APIRouter(tags=["Lost & Found Items"])

SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-development-secret",
)
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# Verify JWT and identify the logged-in user.
def current_user_id(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> int:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
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


# -------------------- LOST ITEMS --------------------

@router.post("/lost-items", status_code=201)
def create_lost_item(
    item: LostItemCreate,
    user_id: int = Depends(current_user_id),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("""
            INSERT INTO lost_items (
                user_id, item_name, category, description, color,
                brand, location, lost_date, lost_time, image_path,
                unique_features
            )
            VALUES (
                :user_id, :item_name, :category, :description, :color,
                :brand, :location, :lost_date, :lost_time, :image_path,
                :unique_features
            )
        """),
        {"user_id": user_id, **item.model_dump()},
    )

    db.commit()

    return {
        "message": "Lost item reported successfully",
        "lost_id": result.lastrowid,
    }


@router.get("/lost-items")
def list_lost_items(
    category: str | None = Query(default=None),
    location: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    sql = """
        SELECT lost_id, user_id, item_name, category, description,
               color, brand, location, lost_date, lost_time,
               image_path, unique_features, status, created_at
        FROM lost_items
        WHERE status IN ('ACTIVE', 'MATCHED')
    """
    params = {}

    if category:
        sql += " AND category = :category"
        params["category"] = category

    if location:
        sql += " AND location LIKE :location"
        params["location"] = f"%{location}%"

    if search:
        sql += """
            AND (
                item_name LIKE :search
                OR description LIKE :search
                OR brand LIKE :search
                OR color LIKE :search
                OR unique_features LIKE :search
            )
        """
        params["search"] = f"%{search}%"

    sql += " ORDER BY created_at DESC"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(row) for row in rows]


# -------------------- FOUND ITEMS --------------------

@router.post("/found-items", status_code=201)
def create_found_item(
    item: FoundItemCreate,
    user_id: int = Depends(current_user_id),
    db: Session = Depends(get_db),
):
    result = db.execute(
        text("""
            INSERT INTO found_items (
                user_id, category, description, color, brand,
                location, found_date, found_time, image_path,
                hidden_details
            )
            VALUES (
                :user_id, :category, :description, :color, :brand,
                :location, :found_date, :found_time, :image_path,
                :hidden_details
            )
        """),
        {"user_id": user_id, **item.model_dump()},
    )

    db.commit()

    return {
        "message": "Found item reported successfully",
        "found_id": result.lastrowid,
    }


@router.get("/found-items")
def list_found_items(
    category: str | None = Query(default=None),
    location: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    sql = """
        SELECT found_id, user_id, category, description, color,
               brand, location, found_date, found_time, image_path,
               status, created_at
        FROM found_items
        WHERE status = 'AVAILABLE'
    """
    params = {}

    if category:
        sql += " AND category = :category"
        params["category"] = category

    if location:
        sql += " AND location LIKE :location"
        params["location"] = f"%{location}%"

    if search:
        sql += """
            AND (
                category LIKE :search
                OR description LIKE :search
                OR brand LIKE :search
                OR color LIKE :search
            )
        """
        params["search"] = f"%{search}%"

    sql += " ORDER BY created_at DESC"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(row) for row in rows]


# -------------------- STATUS OPTIONS --------------------

@router.get("/items/status-options")
def get_status_options():
    return {
        "lost_item_statuses": [
            "ACTIVE",
            "MATCHED",
            "CLAIMED",
            "RECOVERED",
            "CLOSED",
        ],
        "found_item_statuses": [
            "AVAILABLE",
            "CLAIMED",
            "RETURNED",
            "CLOSED",
        ],
    }
