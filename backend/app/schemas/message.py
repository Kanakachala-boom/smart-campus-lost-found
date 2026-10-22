from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class MessageCreateRequest(BaseModel):
    text: str = Field(..., min_length=1)

class MessageResponse(BaseModel):
    message_id: int
    claim_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
