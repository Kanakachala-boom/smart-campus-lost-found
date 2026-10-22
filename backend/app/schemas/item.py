from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class ItemBaseResponse(BaseModel):
    id: int
    type: str  # 'lost' or 'found'
    item_name: str
    category: str
    location: str
    specific_location: Optional[str] = None
    date: dt_date
    time: Optional[str] = None
    description: str
    image_url: Optional[str] = None
    status: str
    user_id: int
    created_at: dt_datetime
    # Specific fields
    custody_location: Optional[str] = None
    contact_preference: Optional[str] = None
    identifying_marks: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ItemListResponse(BaseModel):
    items: List[ItemBaseResponse]
    total: int
    page: int
    limit: int
    total_pages: int

class ItemStatusUpdateRequest(BaseModel):
    status: str = Field(..., max_length=50)

class ItemEditRequest(BaseModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    specific_location: Optional[str] = None
    date: Optional[dt_date] = None
    time: Optional[str] = None
    description: Optional[str] = None
    identifying_marks: Optional[str] = None
    custody_location: Optional[str] = None
    contact_preference: Optional[str] = None
