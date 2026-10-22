from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict

class MatchStatusUpdateRequest(BaseModel):
    status: str = Field(..., max_length=50)

class MatchResponse(BaseModel):
    match_id: int
    lost_item_id: int
    found_item_id: int
    score: int
    confidence_level: str
    match_reason: Optional[str] = None
    status: str
    created_at: datetime
    lost_item: Optional[Any] = None
    found_item: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)
