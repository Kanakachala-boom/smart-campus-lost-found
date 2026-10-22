import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or parent
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Server Settings
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
ENABLE_DOCS: bool = os.getenv("ENABLE_DOCS", "true").lower() in ("true", "1", "yes")

CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
CORS_ORIGINS: list[str] = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]

from sqlalchemy import URL

# Database Settings
DB_HOST: str = os.getenv("DB_HOST", "localhost")
DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
DB_NAME: str = os.getenv("DB_NAME", "campus_lost_found")
DB_USER: str = os.getenv("DB_USER", "root")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))

raw_database_url = os.getenv("DATABASE_URL")
if raw_database_url:
    DATABASE_URL = raw_database_url
else:
    DATABASE_URL = URL.create(
        drivername="mysql+pymysql",
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
    )

# JWT / Authentication Settings
INSECURE_JWT_SECRETS = {
    "nie_smart_campus_lost_and_found_jwt_secret_dev_key_2026",
    "please_set_a_secure_production_secret_32chars",
    "replace_with_a_secure_random_secret_key_minimum_32_characters",
    "your_secure_jwt_secret_key_minimum_32_characters",
    "ci-secret-key-for-automated-tests-32chars!",
}

raw_jwt_secret = (os.getenv("JWT_SECRET") or os.getenv("JWT_SECRET_KEY") or "").strip()
if ENVIRONMENT == "production":
    if not raw_jwt_secret or raw_jwt_secret in INSECURE_JWT_SECRETS:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: A strong, unique JWT_SECRET (min 32 characters) "
            "must be explicitly set in production mode. Refusing to start with missing, default, or placeholder secret."
        )
    if len(raw_jwt_secret) < 32:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET must be at least 32 characters long in production mode."
        )

JWT_SECRET: str = raw_jwt_secret or "nie_smart_campus_lost_and_found_jwt_secret_dev_key_2026"
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or os.getenv("JWT_EXPIRE_MINUTES", "1440")
)

# File Upload Settings
UPLOAD_DIR: Path = BASE_DIR / os.getenv("UPLOAD_DIR", "app/uploads")
MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "5"))
ALLOWED_IMAGE_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# Email / SMTP Settings
SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "lostandfound@nie.ac.in")
SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

# Frontend URL for Password Reset Links
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
if FRONTEND_URL and FRONTEND_URL not in CORS_ORIGINS:
    CORS_ORIGINS.append(FRONTEND_URL)

# Password Reset Token Expiry (minutes)
PASSWORD_RESET_EXPIRE_MINUTES: int = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "15"))
