from datetime import datetime, timedelta, timezone
import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import UserLogin, UserRegister, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-development-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": str(user_id), "exp": expires}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register", response_model=UserResponse,
             status_code=status.HTTP_201_CREATED)
def register_user(data: UserRegister, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()

    if not email.endswith("@nie.ac.in"):
        raise HTTPException(
            status_code=400,
            detail="Only @nie.ac.in email addresses are allowed.",
        )

    existing = db.execute(
        text("SELECT user_id FROM users WHERE email = :email"),
        {"email": email},
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered.")

    password_hash = hash_password(data.password)

    try:
        result = db.execute(
            text("""
                INSERT INTO users (name, email, password_hash, role)
                VALUES (:name, :email, :password_hash, 'USER')
            """),
            {
                "name": data.name.strip(),
                "email": email,
                "password_hash": password_hash,
            },
        )
        db.commit()
        user_id = result.lastrowid

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not register user. Check the users table schema.",
        )

    return {
        "user_id": user_id,
        "name": data.name.strip(),
        "email": email,
        "role": "USER",
    }


@router.post("/login")
def login_user(data: UserLogin, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()

    user = db.execute(
        text("""
            SELECT user_id, name, email, password_hash, role
            FROM users
            WHERE email = :email
        """),
        {"email": email},
    ).mappings().first()

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token(user["user_id"])

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise credentials_error

    user = db.execute(
        text("""
            SELECT user_id, name, email, role
            FROM users
            WHERE user_id = :user_id
        """),
        {"user_id": user_id},
    ).mappings().first()

    if not user:
        raise credentials_error

    return dict(user)