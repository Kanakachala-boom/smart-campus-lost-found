import logging
from typing import Generator, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import DATABASE_URL, DB_PASSWORD, DB_POOL_SIZE, DB_MAX_OVERFLOW

logger = logging.getLogger("smart_campus.database")

# Create engine with resilient pooling parameters
connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 3600,
    "echo": False,
}

db_url_str = str(DATABASE_URL)
if "sqlite" in db_url_str:
    connect_args["check_same_thread"] = False
elif "mysql" in db_url_str:
    connect_args["connect_timeout"] = 5
    engine_kwargs["pool_size"] = DB_POOL_SIZE
    engine_kwargs["max_overflow"] = DB_MAX_OVERFLOW

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and safely closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> Tuple[bool, str | None]:
    """
    Tests active connectivity to the configured database.
    Returns (True, None) if reachable, or (False, error_details) if connection failed.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, None
    except Exception as e:
        err_msg = str(e)
        if DB_PASSWORD and DB_PASSWORD in err_msg:
            err_msg = err_msg.replace(DB_PASSWORD, "******")
        logger.warning(f"Database connection check failed: {err_msg}")
        return False, err_msg

def init_db():
    """Attempts to create all tables defined in SQLAlchemy models if database is reachable."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully via SQLAlchemy.")
    except Exception as e:
        logger.warning(f"Could not auto-create tables via SQLAlchemy (MySQL may be offline or credentials not set): {e}")
