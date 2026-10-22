from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NotificationResponse(BaseModel):
    notification_id: int
    user_id: int
    type: str
    title: str
    message: str
    item_id: Optional[int] = None
    item_type: Optional[str] = None
    target_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UnreadCountResponse(BaseModel):
    unread_count: int
