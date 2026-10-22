from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    student_staff_id: Optional[str] = Field(None, max_length=50)
    email: str = Field(..., max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=6, max_length=128)

class UserLoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: Optional[str] = None
    new_password: str = Field(..., max_length=128)

class UserResponse(BaseModel):
    user_id: int
    name: str
    student_staff_id: Optional[str] = None
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
