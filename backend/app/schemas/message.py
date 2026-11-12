from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator

class MessageCreateRequest(BaseModel):
    text: Optional[str] = None
    message: Optional[str] = None
    message_text: Optional[str] = None
    receiver_id: Optional[int] = None
    recipient_id: Optional[int] = None
    claim_id: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def extract_text_and_receiver(cls, values):
        if isinstance(values, dict):
            # Resolve text content
            content = values.get("text") or values.get("message_text") or values.get("message")
            if content is not None:
                values["text"] = str(content).strip()
            # Resolve receiver id
            rec = values.get("receiver_id") or values.get("recipient_id")
            if rec is not None:
                try:
                    values["receiver_id"] = int(rec)
                except (ValueError, TypeError):
                    pass
        return values

class MessageResponse(BaseModel):
    message_id: int
    sender_id: int
    receiver_id: int
    claim_id: Optional[int] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    text: str
    message: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    is_read: bool = False

    model_config = ConfigDict(from_attributes=True)

class ConversationSummary(BaseModel):
    other_user_id: int
    other_user_name: str
    other_user_role: Optional[str] = "STUDENT"
    last_message: str
    last_message_at: datetime
    unread_count: int = 0
    claim_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
