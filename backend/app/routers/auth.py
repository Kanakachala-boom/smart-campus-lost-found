import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.config import FRONTEND_URL, PASSWORD_RESET_EXPIRE_MINUTES
from app.database import get_db
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.services.email_service import is_smtp_configured, send_password_reset_email
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user,
)

logger = logging.getLogger("smart_campus.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new student or staff account with official @nie.ac.in credentials."""
    email_clean = payload.email.strip().lower()
    student_id_clean = payload.student_staff_id.strip().upper() if payload.student_staff_id else None

    # Check for existing email
    if db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account is already registered with this institutional email address.",
        )

    # Determine initial role: only exact official admin address or create_admin.py grants admin privileges
    role = "ADMIN" if email_clean == "admin@nie.ac.in" else "STUDENT"

    new_user = User(
        name=payload.name.strip(),
        email=email_clean,
        phone=payload.phone.strip() if payload.phone else None,
        password_hash=hash_password(payload.password),
        role=role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": str(new_user.user_id), "role": new_user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )

@router.post("/login", response_model=TokenResponse)
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Authenticates user credentials.
    Supports both JSON body ({email, password}) and OAuth2 Form data (username, password).
    """
    email = None
    password = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        email = body.get("email") or body.get("username")
        password = body.get("password")
    else:
        # Form data fallback
        form = await request.form()
        email = form.get("username") or form.get("email")
        password = form.get("password")

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both email and password are required.",
        )

    email_clean = str(email).strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(str(password), user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your NIE email and password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact campus administration.",
        )

    access_token = create_access_token(data={"sub": str(user.user_id), "role": user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return UserResponse.model_validate(current_user)

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Secure password recovery endpoint.
    - Validates institutional NIE domain.
    - Validates that SMTP service is configured; fails safely without faking delivery.
    - Generates a cryptographically strong, random, short-lived reset token.
    - Stores only a SHA-256 hash in the database.
    - Dispatches a reset link via SMTP to the user's registered NIE email.
    - Never returns reset tokens, reset links, or account existence in the response.
    """
    # 1. Require SMTP configuration on the server to prevent silently pretending email was sent
    if not is_smtp_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery service is currently not configured on this server. Please configure SMTP credentials in backend/.env to enable password recovery.",
        )

    email_clean = payload.email.strip().lower()
    if not email_clean.endswith("@nie.ac.in"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use your official NIE email address (@nie.ac.in).",
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if user and user.is_active:
        # Rate limiting: throttle requests if a reset token was created within the last 60 seconds
        one_minute_ago = datetime.now(timezone.utc) - timedelta(seconds=60)
        recent_request = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.user_id == user.user_id,
                PasswordResetToken.created_at >= one_minute_ago,
            )
            .first()
        )
        if not recent_request:
            # Invalidate any previously unexpired/unused reset tokens for this user
            db.query(PasswordResetToken).filter(
                PasswordResetToken.user_id == user.user_id,
                PasswordResetToken.used == False,
            ).update({"used": True})

            # Generate cryptographically secure random token (URL-safe, 32 bytes entropy)
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)

            # Store only the SHA-256 hash of the token in the database
            reset_record = PasswordResetToken(
                user_id=user.user_id,
                token_hash=token_hash,
                expires_at=expires_at,
                used=False,
            )
            db.add(reset_record)
            db.commit()

            # Construct frontend reset link
            reset_link = f"{FRONTEND_URL}/reset-password?token={raw_token}"

            # Dispatch email via SMTP (never log the token or link)
            send_password_reset_email(
                to_email=user.email,
                recipient_name=user.name,
                reset_link=reset_link,
            )

    # Return generic neutral confirmation message to prevent account enumeration
    return {
        "message": "If an account matches the details provided, password reset instructions will be sent to the registered contact."
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Secure password reset completion endpoint.
    - Validates token presence and SHA-256 hash against database.
    - Rejects expired or already used tokens.
    - Enforces 8-character minimum password policy.
    - Hashes new password with salted bcrypt.
    - Invalidates the reset token immediately upon successful password change.
    - Never reveals or logs the new password.
    """
    if not payload.token or not payload.token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is required. Please use the link provided in your recovery email.",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )

    # Compute SHA-256 hash of provided raw token
    token_hash = hashlib.sha256(payload.token.strip().encode("utf-8")).hexdigest()

    token_record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    if not token_record or token_record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used password reset link. Please request a new one.",
        )

    # Check token expiration
    now_utc = datetime.now(timezone.utc)
    token_expires = token_record.expires_at
    if token_expires.tzinfo is None:
        token_expires = token_expires.replace(tzinfo=timezone.utc)

    if token_expires < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has expired. Please request a new one.",
        )

    user = db.query(User).filter(User.user_id == token_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this reset request was not found or is inactive.",
        )

    # Securely hash new password with salted bcrypt
    user.password_hash = hash_password(payload.new_password)

    # Invalidate this token and all other tokens for this user to prevent any reuse
    token_record.used = True
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.user_id
    ).update({"used": True})
    db.commit()

    logger.info(f"Password reset successfully completed for user_id={user.user_id}")
    return {
        "message": "Password has been updated successfully. You can now sign in with your new password."
    }
