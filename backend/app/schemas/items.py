
from datetime import date, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LostItemCreate(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=255)
    category: str
    description: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    location_lost: Optional[str] = None
    location: Optional[str] = None
    date_lost: Optional[date] = None
    lost_date: Optional[date] = None
    lost_time: Optional[time] = None
    time_lost: Optional[str] = None
    image_path: Optional[str] = None
    unique_features: Optional[str] = None
    identifying_marks: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_synonyms(cls, values):
        if isinstance(values, dict):
            # item_name synonyms
            if "item_name" not in values:
                values["item_name"] = values.get("title") or values.get("name")
            # location synonyms
            loc = values.get("location_lost") or values.get("location") or values.get("lost_location")
            if loc:
                values["location"] = loc
                values["location_lost"] = loc
            # date synonyms
            d = values.get("date_lost") or values.get("date") or values.get("lost_date")
            if d:
                values["lost_date"] = d
                values["date_lost"] = d
            # identifying marks synonyms
            marks = values.get("identifying_marks") or values.get("unique_features")
            if marks:
                values["unique_features"] = marks
                values["identifying_marks"] = marks
        return values


class FoundItemCreate(BaseModel):
    item_name: Optional[str] = None
    category: str
    description: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    location_found: Optional[str] = None
    location: Optional[str] = None
    date_found: Optional[date] = None
    found_date: Optional[date] = None
    found_time: Optional[time] = None
    time_found: Optional[str] = None
    image_path: Optional[str] = None
    hidden_details: Optional[str] = None
    custody_location: Optional[str] = None
    contact_preference: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_synonyms(cls, values):
        if isinstance(values, dict):
            if "item_name" not in values:
                values["item_name"] = values.get("title") or values.get("name")
            loc = values.get("location_found") or values.get("location") or values.get("found_location")
            if loc:
                values["location"] = loc
                values["location_found"] = loc
            d = values.get("date_found") or values.get("date") or values.get("found_date")
            if d:
                values["found_date"] = d
                values["date_found"] = d
        return values


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
