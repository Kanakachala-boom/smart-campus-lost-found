import os
import uuid
import math
from datetime import date
from pathlib import Path
from typing import Optional, List, Any
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    Query,
    Request,
)
from sqlalchemy import or_, desc
from sqlalchemy.orm import Session
from app.config import UPLOAD_DIR, ALLOWED_IMAGE_EXTENSIONS, MAX_UPLOAD_SIZE_MB
from app.database import get_db
from app.models.user import User
from app.models.item import LostItem, FoundItem
from app.schemas.item import ItemBaseResponse, ItemListResponse, ItemStatusUpdateRequest, ItemEditRequest
from app.services.auth_service import get_current_user, get_optional_current_user
from app.services.matching_engine import run_matching_for_lost_item, run_matching_for_found_item, resolve_matches_for_item
from app.services.provenance import is_seed_demo_lost, is_seed_demo_found

router = APIRouter(prefix="/api", tags=["Items"])

# Ensure uploads directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Image magic byte signatures for content validation
IMAGE_MAGIC_BYTES = {
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".gif": (b"GIF87a", b"GIF89a"),
    ".webp": (b"RIFF",),
}

async def process_image_upload(file: Optional[UploadFile]) -> Optional[str]:
    """Validates and securely stores an uploaded image file."""
    if not file or not file.filename:
        return None

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    # Read and validate size
    content = await file.read()
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image size exceeds the maximum allowed limit of {MAX_UPLOAD_SIZE_MB}MB.",
        )

    # Validate image magic bytes to reject disguised non-image files
    if ext in IMAGE_MAGIC_BYTES:
        signatures = IMAGE_MAGIC_BYTES[ext]
        matches_sig = any(content.startswith(sig) for sig in signatures)
        if ext == ".webp" and matches_sig:
            matches_sig = content[8:12] == b"WEBP"
        if not matches_sig:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file content does not match a valid {ext.lstrip('.').upper()} image signature.",
            )

    safe_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = UPLOAD_DIR / safe_filename
    with open(target_path, "wb") as f:
        f.write(content)

    return f"/uploads/{safe_filename}"

def serialize_lost_item(item: LostItem, current_user: Optional[User] = None) -> dict:
    """Serializes a LostItem, concealing private identifying marks unless authorized."""
    can_view_private = current_user and (current_user.user_id == item.user_id or current_user.role == "ADMIN")
    display_desc = item.description or ""
    if "\n[Private Marks: " in display_desc:
        display_desc = display_desc.split("\n[Private Marks: ", 1)[0]

    return {
        "id": item.lost_item_id,
        "lost_item_id": item.lost_item_id,
        "type": "lost",
        "item_name": item.item_name,
        "title": item.item_name,
        "category": item.category,
        "location": item.location_lost,
        "location_lost": item.location_lost,
        "specific_location": item.specific_location,
        "date": item.date_lost,
        "date_lost": item.date_lost,
        "time": item.time_lost,
        "time_lost": item.time_lost,
        "description": display_desc,
        "image_url": item.image_url,
        "status": item.status,
        "user_id": item.user_id,
        "created_at": item.created_at,
        "identifying_marks": item.identifying_marks if can_view_private else None,
        "custody_location": None,
        "contact_preference": None,
    }

def serialize_found_item(item: FoundItem) -> dict:
    """Serializes a FoundItem into uniform client response."""
    desc = item.description or ""
    custody = "Campus Security"
    contact = "Coordinate Handover via Campus Security / Admin"
    if "\n[Custody: " in desc:
        try:
            custody = desc.split("\n[Custody: ", 1)[1].split("]", 1)[0]
        except Exception:
            pass
    if "\n[Contact: " in desc:
        try:
            contact = desc.split("\n[Contact: ", 1)[1].split("]", 1)[0]
        except Exception:
            pass

    display_desc = desc
    for tag in ("\n[Custody: ", "\n[Contact: "):
        if tag in display_desc:
            display_desc = display_desc.split(tag, 1)[0]

    return {
        "id": item.found_item_id,
        "found_item_id": item.found_item_id,
        "type": "found",
        "item_name": item.item_name,
        "title": item.item_name,
        "category": item.category,
        "location": item.location_found,
        "location_found": item.location_found,
        "specific_location": item.specific_location,
        "date": item.date_found,
        "date_found": item.date_found,
        "time": item.time_found,
        "time_found": item.time_found,
        "description": display_desc,
        "image_url": item.image_url,
        "status": item.status,
        "user_id": item.user_id,
        "created_at": item.created_at,
        "custody_location": custody,
        "contact_preference": contact,
        "identifying_marks": None,
    }

@router.get("/items")
def list_all_items(
    type: str = Query("all"),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Browses lost and found items with search, category/location/status filters, and pagination."""
    items_list = []

    # Query Lost Items
    if type in ("all", "lost"):
        q = db.query(LostItem)
        if status == "ACTIVE" or (not status and type != "all"):
            q = q.filter(LostItem.status.in_(["ACTIVE", "POTENTIAL_MATCH"]))
        elif status and status != "ALL":
            q = q.filter(LostItem.status == status)
        if category and category != "ALL":
            q = q.filter(LostItem.category == category)
        if location and location != "ALL":
            q = q.filter(LostItem.location_lost == location)
        if search:
            s = f"%{search.strip()}%"
            q = q.filter(or_(LostItem.item_name.ilike(s), LostItem.description.ilike(s)))
        
        for item in q.all():
            items_list.append(serialize_lost_item(item, current_user))

    # Query Found Items
    if type in ("all", "found"):
        q = db.query(FoundItem)
        if status == "ACTIVE" or (not status and type != "all"):
            q = q.filter(FoundItem.status.in_(["AVAILABLE", "POTENTIAL_MATCH"]))
        elif status and status != "ALL":
            mapped_status = "AVAILABLE" if status == "ACTIVE" else status
            q = q.filter(FoundItem.status == mapped_status)
        if category and category != "ALL":
            q = q.filter(FoundItem.category == category)
        if location and location != "ALL":
            q = q.filter(FoundItem.location_found == location)
        if search:
            s = f"%{search.strip()}%"
            q = q.filter(or_(FoundItem.item_name.ilike(s), FoundItem.description.ilike(s)))
        
        for item in q.all():
            items_list.append(serialize_found_item(item))

    # Sort combined items by created_at descending
    items_list.sort(key=lambda x: x["created_at"], reverse=True)

    total = len(items_list)
    total_pages = max(1, math.ceil(total / limit))
    offset = (page - 1) * limit
    paginated_items = items_list[offset : offset + limit]

    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }

@router.get("/lost-items")
def list_lost_items(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    return list_all_items("lost", search, category, location, status, page, limit, db, current_user)

@router.get("/found-items")
def list_found_items(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    return list_all_items("found", search, category, location, status, page, limit, db, current_user)

@router.get("/lost-items/{item_id}")
def get_lost_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieves full details for a lost item. Identifying marks are shielded for non-owners/non-admins."""
    item = db.query(LostItem).filter(LostItem.lost_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item report not found.")
    return serialize_lost_item(item, current_user)

@router.get("/found-items/{item_id}")
def get_found_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieves details for a found item."""
    item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Found item report not found.")
    return serialize_found_item(item)

async def _extract_request_payload(
    request: Request,
    fallback_data: dict,
    fallback_image: Optional[UploadFile] = None,
) -> tuple[dict, Optional[UploadFile]]:
    """Extracts payload data and optional image from JSON or multipart/form-data."""
    content_type = request.headers.get("content-type", "").lower()
    data = dict(fallback_data)
    image = fallback_image

    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                data.update(body)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed JSON body.",
            )
    elif "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        try:
            form = await request.form()
            for k, v in form.items():
                if isinstance(v, UploadFile) or hasattr(v, "filename"):
                    if k == "image" and getattr(v, "filename", None):
                        image = v
                else:
                    data[k] = v
        except Exception:
            pass

    return data, image

def _parse_report_date(val: Any, field_name: str) -> date:
    """Parses date from ISO string or datetime.date object with 422 validation."""
    if isinstance(val, date):
        return val
    if isinstance(val, str) and val.strip():
        try:
            return date.fromisoformat(val.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=[{
                    "loc": ["body", field_name],
                    "msg": "Input should be a valid date (YYYY-MM-DD)",
                    "type": "date_from_date_parsing",
                }],
            )
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=[{
            "loc": ["body", field_name],
            "msg": "Field required",
            "type": "missing",
        }],
    )

def _parse_bool(val: Any, default: bool = True) -> bool:
    """Safely converts boolean, string, or integer values to bool."""
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.strip().lower() not in ("false", "0", "no", "")
    return bool(val)

@router.post("/lost-items", status_code=status.HTTP_201_CREATED)
async def create_lost_item(
    request: Request,
    item_name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    location_lost: Optional[str] = Form(None),
    date_lost: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    specific_location: Optional[str] = Form(None),
    time_lost: Optional[str] = Form(None),
    identifying_marks: Optional[str] = Form(None),
    notify_on_match: Optional[Any] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submits a new lost item report and triggers the intelligent matching engine.
    Supports both multipart/form-data (with file upload) and application/json payloads,
    with flexible field synonym mapping (item_name/title/name, location_lost/location, date_lost/date).
    """
    form_fallbacks = {
        k: v for k, v in {
            "item_name": item_name,
            "category": category,
            "location_lost": location_lost,
            "date_lost": date_lost,
            "description": description,
            "specific_location": specific_location,
            "time_lost": time_lost,
            "identifying_marks": identifying_marks,
            "notify_on_match": notify_on_match,
        }.items() if v is not None
    }
    data, uploaded_image = await _extract_request_payload(request, form_fallbacks, image)

    # Resolve field synonyms
    resolved_name = data.get("item_name") or data.get("title") or data.get("name")
    resolved_category = data.get("category")
    resolved_location = data.get("location_lost") or data.get("location") or data.get("lost_location")
    raw_date = data.get("date_lost") or data.get("date") or data.get("lost_date")
    resolved_desc = data.get("description")

    errors = []
    if not resolved_name or not str(resolved_name).strip():
        errors.append({"loc": ["body", "item_name"], "msg": "Field required", "type": "missing"})
    if not resolved_category or not str(resolved_category).strip():
        errors.append({"loc": ["body", "category"], "msg": "Field required", "type": "missing"})
    if not resolved_location or not str(resolved_location).strip():
        errors.append({"loc": ["body", "location_lost"], "msg": "Field required", "type": "missing"})
    if not raw_date:
        errors.append({"loc": ["body", "date_lost"], "msg": "Field required", "type": "missing"})
    if not resolved_desc or not str(resolved_desc).strip():
        errors.append({"loc": ["body", "description"], "msg": "Field required", "type": "missing"})

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=errors,
        )

    parsed_date = _parse_report_date(raw_date, "date_lost")
    image_url = await process_image_upload(uploaded_image)
    if not image_url and (data.get("image_url") or data.get("image_path")):
        image_url = data.get("image_url") or data.get("image_path")

    resolved_specific = data.get("specific_location")
    resolved_time = data.get("time_lost") or data.get("time") or data.get("lost_time")
    resolved_marks = data.get("identifying_marks") or data.get("unique_features")
    resolved_notify = _parse_bool(data.get("notify_on_match"), default=True)

    desc_clean = str(resolved_desc).strip()
    if resolved_marks and str(resolved_marks).strip():
        desc_clean += f"\n[Private Marks: {str(resolved_marks).strip()}]"

    new_item = LostItem(
        user_id=current_user.user_id,
        item_name=str(resolved_name).strip(),
        category=str(resolved_category).strip(),
        location_lost=str(resolved_location).strip(),
        specific_location=str(resolved_specific).strip() if resolved_specific else None,
        date_lost=parsed_date,
        time_lost=str(resolved_time).strip() if resolved_time else None,
        description=desc_clean,
        image_url=image_url,
        notify_on_match=resolved_notify,
        status="ACTIVE",
    )
    if resolved_marks:
        new_item.identifying_marks = str(resolved_marks).strip()

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # Run background matching evaluation
    try:
        run_matching_for_lost_item(db, new_item)
    except Exception as e:
        # Don't fail report creation if matching engine has non-fatal error
        pass

    # Record in-app confirmation notification for reporter
    try:
        from app.models.notification import Notification
        notif = Notification(
            user_id=current_user.user_id,
            type="REPORT_CONFIRMED",
            title="Lost Item Report Registered",
            message=f"Your lost report for '{new_item.item_name}' was recorded under ID #{new_item.lost_item_id}. Automated matching is active.",
            item_id=new_item.lost_item_id,
            item_type="lost",
            target_url=f"/items/lost/{new_item.lost_item_id}",
            is_read=False,
        )
        db.add(notif)
        db.commit()
    except Exception:
        pass

    # Multi-channel notification: Email and SMS confirmation
    try:
        from app.services.email_service import send_report_confirmation_email
        from app.services.sms_service import send_sms_notification
        send_report_confirmation_email(
            to_email=current_user.email,
            recipient_name=current_user.name,
            report_type="lost",
            report_id=new_item.lost_item_id,
            item_title=new_item.item_name,
            status=new_item.status,
        )
        if current_user.phone:
            send_sms_notification(
                phone_number=current_user.phone,
                message=f"[NIE L&F] Lost report registered: #{new_item.lost_item_id} '{new_item.item_name}'. Automated matching active."
            )
    except Exception:
        pass

    return serialize_lost_item(new_item, current_user)

@router.post("/found-items", status_code=status.HTTP_201_CREATED)
async def create_found_item(
    request: Request,
    item_name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    location_found: Optional[str] = Form(None),
    date_found: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    custody_location: Optional[str] = Form(None),
    contact_preference: Optional[str] = Form(None),
    specific_location: Optional[str] = Form(None),
    time_found: Optional[str] = Form(None),
    notify_on_match: Optional[Any] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submits a new found item report and triggers the intelligent matching engine.
    Supports both multipart/form-data and application/json payloads with synonym mapping.
    """
    form_fallbacks = {
        k: v for k, v in {
            "item_name": item_name,
            "category": category,
            "location_found": location_found,
            "date_found": date_found,
            "description": description,
            "custody_location": custody_location,
            "contact_preference": contact_preference,
            "specific_location": specific_location,
            "time_found": time_found,
            "notify_on_match": notify_on_match,
        }.items() if v is not None
    }
    data, uploaded_image = await _extract_request_payload(request, form_fallbacks, image)

    resolved_name = data.get("item_name") or data.get("title") or data.get("name")
    resolved_category = data.get("category")
    resolved_location = data.get("location_found") or data.get("location") or data.get("found_location")
    raw_date = data.get("date_found") or data.get("date") or data.get("found_date")
    resolved_desc = data.get("description")
    resolved_custody = data.get("custody_location") or "Campus Security"
    resolved_contact = (
        data.get("contact_preference")
        or "Coordinate Handover via Campus Security / Admin"
    )

    errors = []
    if not resolved_name or not str(resolved_name).strip():
        errors.append({"loc": ["body", "item_name"], "msg": "Field required", "type": "missing"})
    if not resolved_category or not str(resolved_category).strip():
        errors.append({"loc": ["body", "category"], "msg": "Field required", "type": "missing"})
    if not resolved_location or not str(resolved_location).strip():
        errors.append({"loc": ["body", "location_found"], "msg": "Field required", "type": "missing"})
    if not raw_date:
        errors.append({"loc": ["body", "date_found"], "msg": "Field required", "type": "missing"})
    if not resolved_desc or not str(resolved_desc).strip():
        errors.append({"loc": ["body", "description"], "msg": "Field required", "type": "missing"})

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=errors,
        )

    parsed_date = _parse_report_date(raw_date, "date_found")
    image_url = await process_image_upload(uploaded_image)
    if not image_url and (data.get("image_url") or data.get("image_path")):
        image_url = data.get("image_url") or data.get("image_path")

    resolved_specific = data.get("specific_location")
    resolved_time = data.get("time_found") or data.get("time") or data.get("found_time")
    resolved_notify = _parse_bool(data.get("notify_on_match"), default=True)

    desc_clean = str(resolved_desc).strip()
    if resolved_custody and str(resolved_custody).strip():
        desc_clean += f"\n[Custody: {str(resolved_custody).strip()}]"
    if resolved_contact and str(resolved_contact).strip():
        desc_clean += f"\n[Contact: {str(resolved_contact).strip()}]"

    new_item = FoundItem(
        user_id=current_user.user_id,
        item_name=str(resolved_name).strip(),
        category=str(resolved_category).strip(),
        location_found=str(resolved_location).strip(),
        specific_location=str(resolved_specific).strip() if resolved_specific else None,
        date_found=parsed_date,
        time_found=str(resolved_time).strip() if resolved_time else None,
        description=desc_clean,
        custody_location=str(resolved_custody).strip(),
        contact_preference=str(resolved_contact).strip(),
        image_url=image_url,
        notify_on_match=resolved_notify,
        status="AVAILABLE",
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # Run matching evaluation
    try:
        run_matching_for_found_item(db, new_item)
    except Exception as e:
        pass

    # Record in-app confirmation notification for finder
    try:
        from app.models.notification import Notification
        notif = Notification(
            user_id=current_user.user_id,
            type="REPORT_CONFIRMED",
            title="Found Item Report Registered",
            message=f"Thank you! Your found report for '{new_item.item_name}' was recorded under ID #{new_item.found_item_id}.",
            item_id=new_item.found_item_id,
            item_type="found",
            target_url=f"/items/found/{new_item.found_item_id}",
            is_read=False,
        )
        db.add(notif)
        db.commit()
    except Exception:
        pass

    # Multi-channel notification: Email and SMS confirmation
    try:
        from app.services.email_service import send_report_confirmation_email
        from app.services.sms_service import send_sms_notification
        send_report_confirmation_email(
            to_email=current_user.email,
            recipient_name=current_user.name,
            report_type="found",
            report_id=new_item.found_item_id,
            item_title=new_item.item_name,
            status=new_item.status,
        )
        if current_user.phone:
            send_sms_notification(
                phone_number=current_user.phone,
                message=f"[NIE L&F] Found report registered: #{new_item.found_item_id} '{new_item.item_name}'. Thank you for reporting."
            )
    except Exception:
        pass

    return serialize_found_item(new_item)

@router.patch("/lost-items/{item_id}")
def update_lost_item_status(
    item_id: int,
    payload: ItemStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates a lost item status. Creator or admin only. Resolves matches when recovered or closed."""
    item = db.query(LostItem).filter(LostItem.lost_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item report not found.")
    if item.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to modify this report.")

    item.status = payload.status
    if payload.status.upper() in ("RECLAIMED", "CLOSED", "RESOLVED", "RETURNED"):
        resolve_matches_for_item(db, "lost", item.lost_item_id)
    db.commit()
    db.refresh(item)
    return serialize_lost_item(item, current_user)

@router.put("/lost-items/{item_id}")
def update_lost_item_details(
    item_id: int,
    payload: ItemEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edits a lost item's details and triggers match recalculation. Creator or admin only."""
    item = db.query(LostItem).filter(LostItem.lost_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item report not found.")
    if item.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to modify this report.")

    if payload.item_name is not None and payload.item_name.strip():
        item.item_name = payload.item_name.strip()
    if payload.category is not None and payload.category.strip():
        item.category = payload.category.strip()
    if payload.location is not None and payload.location.strip():
        item.location_lost = payload.location.strip()
    if payload.date is not None:
        item.date_lost = payload.date
    if payload.time is not None:
        item.time_lost = payload.time
    if payload.description is not None:
        desc_clean = payload.description.strip()
        marks = payload.identifying_marks or item.identifying_marks
        if marks and marks.strip():
            desc_clean += f"\n[Private Marks: {marks.strip()}]"
        item.description = desc_clean
    elif payload.identifying_marks is not None:
        item.identifying_marks = payload.identifying_marks.strip()

    db.commit()
    db.refresh(item)

    try:
        run_matching_for_lost_item(db, item)
    except Exception:
        pass

    return serialize_lost_item(item, current_user)

@router.patch("/found-items/{item_id}")
def update_found_item_status(
    item_id: int,
    payload: ItemStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates a found item status. Creator or admin only. Resolves matches when handed over or closed."""
    item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Found item report not found.")
    if item.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to modify this report.")

    item.status = payload.status
    if payload.status.upper() in ("RETURNED", "CLOSED", "RESOLVED", "CLAIMED"):
        resolve_matches_for_item(db, "found", item.found_item_id)
    db.commit()
    db.refresh(item)
    return serialize_found_item(item)

@router.put("/found-items/{item_id}")
def update_found_item_details(
    item_id: int,
    payload: ItemEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edits a found item's details and triggers match recalculation. Creator or admin only."""
    item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Found item report not found.")
    if item.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to modify this report.")

    if payload.item_name is not None and payload.item_name.strip():
        item.item_name = payload.item_name.strip()
    if payload.category is not None and payload.category.strip():
        item.category = payload.category.strip()
    if payload.location is not None and payload.location.strip():
        item.location_found = payload.location.strip()
    if payload.date is not None:
        item.date_found = payload.date
    if payload.time is not None:
        item.time_found = payload.time

    desc_clean = (payload.description or item.description or "").strip()
    for tag in ("\n[Custody: ", "\n[Contact: "):
        if tag in desc_clean:
            desc_clean = desc_clean.split(tag, 1)[0]

    custody = payload.custody_location or item.custody_location
    contact = payload.contact_preference or item.contact_preference
    if custody:
        desc_clean += f"\n[Custody: {custody.strip()}]"
    if contact:
        desc_clean += f"\n[Contact: {contact.strip()}]"
    item.description = desc_clean

    db.commit()
    db.refresh(item)

    try:
        run_matching_for_found_item(db, item)
    except Exception:
        pass

    return serialize_found_item(item)

@router.delete("/lost-items/{item_id}")
def delete_lost_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a lost item. Creator or admin only."""
    item = db.query(LostItem).filter(LostItem.lost_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lost item report not found.")
    if item.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to delete this report.")

    resolve_matches_for_item(db, "lost", item.lost_item_id)
    db.delete(item)
    db.commit()
    return {"message": "Report deleted successfully."}

@router.delete("/found-items/{item_id}")
def delete_found_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes or archives a found item while protecting claim audit trails. Creator or admin only."""
    item = db.query(FoundItem).filter(FoundItem.found_item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Found item report not found.")
    if item.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to delete this report.")

    from app.models.claim import Claim
    has_claims = db.query(Claim).filter(Claim.found_item_id == item_id).count() > 0
    if has_claims:
        item.status = "CLOSED"
        resolve_matches_for_item(db, "found", item.found_item_id)
        db.commit()
        return {"message": "Report has associated ownership claims and has been archived and marked CLOSED."}

    resolve_matches_for_item(db, "found", item.found_item_id)
    db.delete(item)
    db.commit()
    return {"message": "Report deleted successfully."}

@router.get("/users/me/reports")
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all lost and found items reported by the current authenticated user."""
    lost = db.query(LostItem).filter(LostItem.user_id == current_user.user_id).order_by(desc(LostItem.created_at)).all()
    found = db.query(FoundItem).filter(FoundItem.user_id == current_user.user_id).order_by(desc(FoundItem.created_at)).all()

    return {
        "lost": [serialize_lost_item(i, current_user) for i in lost],
        "found": [serialize_found_item(i) for i in found],
    }
