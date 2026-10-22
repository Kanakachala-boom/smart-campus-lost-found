from datetime import date, datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict

class ClaimCreateRequest(BaseModel):
    found_item_id: int
    verification_details: str = Field(..., min_length=5)
    lost_date: Optional[date] = None
    lost_location: Optional[str] = None
    claimant_answer: Optional[str] = None
    proof_image_url: Optional[str] = None

class ClaimVerifyRequest(BaseModel):
    status: str  # 'VERIFIED' or 'REJECTED'
    handover_instructions: Optional[str] = None
    rejection_reason: Optional[str] = None

class ClaimResponse(BaseModel):
    claim_id: int
    found_item_id: int
    claimant_user_id: int
    claimant_name: Optional[str] = None
    status: str
    verification_details: str
    lost_date: Optional[date] = None
    lost_location: Optional[str] = None
    claimant_answer: Optional[str] = None
    proof_image_url: Optional[str] = None
    handover_instructions: Optional[str] = None
    rejection_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    found_item: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)
