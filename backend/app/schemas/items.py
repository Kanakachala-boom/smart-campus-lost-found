
from datetime import date, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class LostItemCreate(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=255)
    category: str
    description: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    location: str
    lost_date: date
    lost_time: Optional[time] = None
    image_path: Optional[str] = None
    unique_features: Optional[str] = None


class FoundItemCreate(BaseModel):
    category: str
    description: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    location: str
    found_date: date
    found_time: Optional[time] = None
    image_path: Optional[str] = None
    hidden_details: Optional[str] = None


class LostItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lost_id: int
    user_id: int
    item_name: str
    category: str
    description: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    location: str
    lost_date: date
    lost_time: Optional[time] = None
    image_path: Optional[str] = None
    unique_features: Optional[str] = None
    status: str


class FoundItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    found_id: int
    user_id: int
    category: str
    description: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    location: str
    found_date: date
    found_time: Optional[time] = None
    image_path: Optional[str] = None
    hidden_details: Optional[str] = None
    status: str
