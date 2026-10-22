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
        "type": "lost",
        "item_name": item.item_name,
        "category": item.category,
        "location": item.location_lost,
        "specific_location": item.specific_location,
        "date": item.date_lost,
        "time": item.time_lost,
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
        "type": "found",
        "item_name": item.item_name,
        "category": item.category,
        "location": item.location_found,
        "specific_location": item.specific_location,
        "date": item.date_found,
        "time": item.time_found,
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

@router.post("/lost-items", status_code=status.HTTP_201_CREATED)
async def create_lost_item(
    item_name: str = Form(...),
    category: str = Form(...),
    location_lost: str = Form(...),
    date_lost: date = Form(...),
    description: str = Form(...),
    specific_location: Optional[str] = Form(None),
    time_lost: Optional[str] = Form(None),
    identifying_marks: Optional[str] = Form(None),
    notify_on_match: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submits a new lost item report and triggers the intelligent matching engine."""
    image_url = await process_image_upload(image)
    desc_clean = description.strip()
    if identifying_marks and identifying_marks.strip():
        desc_clean += f"\n[Private Marks: {identifying_marks.strip()}]"

    new_item = LostItem(
        user_id=current_user.user_id,
        item_name=item_name.strip(),
        category=category.strip(),
        location_lost=location_lost.strip(),
        specific_location=specific_location.strip() if specific_location else None,
        date_lost=date_lost,
        time_lost=time_lost.strip() if time_lost else None,
        description=desc_clean,
        image_url=image_url,
        notify_on_match=notify_on_match,
        status="ACTIVE",
    )
    if identifying_marks:
        new_item.identifying_marks = identifying_marks.strip()

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
    item_name: str = Form(...),
    category: str = Form(...),
    location_found: str = Form(...),
    date_found: date = Form(...),
    description: str = Form(...),
    custody_location: str = Form(...),
    contact_preference: str = Form("Coordinate Handover via Campus Security / Admin"),
    specific_location: Optional[str] = Form(None),
    time_found: Optional[str] = Form(None),
    notify_on_match: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_url = await process_image_upload(image)
    desc_clean = description.strip()
    if custody_location and custody_location.strip():
        desc_clean += f"\n[Custody: {custody_location.strip()}]"
    if contact_preference and contact_preference.strip():
        desc_clean += f"\n[Contact: {contact_preference.strip()}]"

    new_item = FoundItem(
        user_id=current_user.user_id,
        item_name=item_name.strip(),
        category=category.strip(),
        location_found=location_found.strip(),
        specific_location=specific_location.strip() if specific_location else None,
        date_found=date_found,
        time_found=time_found.strip() if time_found else None,
        description=desc_clean,
        custody_location=custody_location.strip(),
        contact_preference=contact_preference.strip(),
        image_url=image_url,
        notify_on_match=notify_on_match,
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
