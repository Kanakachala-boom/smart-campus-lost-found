import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.item import LostItem, FoundItem
from app.services.auth_service import hash_password, create_access_token

# Isolated SQLite in-memory database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    user = User(
        name="Test Student",
        student_staff_id="4NI21IS999",
        email="test_student@nie.ac.in",
        phone="9998887770",
        password_hash=hash_password("Password@123"),
        role="STUDENT",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_admin(db_session):
    admin = User(
        name="Admin Staff",
        student_staff_id="NIE-ADM-001",
        email="admin@nie.ac.in",
        phone="9998887771",
        password_hash=hash_password("Password@123"),
        role="ADMIN",
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin

@pytest.fixture
def user_token(test_user):
    return create_access_token({"sub": str(test_user.user_id), "role": test_user.role})

@pytest.fixture
def admin_token(test_admin):
    return create_access_token({"sub": str(test_admin.user_id), "role": test_admin.role})
