def test_user_registration(client):
    payload = {
        "name": "Arjun Kumar",
        "student_staff_id": "4NI22CS010",
        "email": "2022cs_arjun_k@nie.ac.in",
        "phone": "9876543299",
        "password": "SecurePassword123",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == payload["email"]
    assert data["user"]["name"] == payload["name"]
    assert data["user"]["role"] == "STUDENT"

def test_duplicate_registration_fails(client, test_user):
    payload = {
        "name": "Duplicate Student",
        "student_staff_id": test_user.student_staff_id,
        "email": test_user.email,
        "phone": "9876543298",
        "password": "Password@123",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_login_success(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "Password@123",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_user.email

def test_login_invalid_password(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "WrongPassword",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_get_current_user_profile(client, user_token, test_user):
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name

from unittest.mock import patch
from datetime import datetime, timedelta, timezone
import hashlib
from app.models.password_reset import PasswordResetToken

def test_get_me_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_forgot_password_smtp_not_configured(client):
    with patch("app.routers.auth.is_smtp_configured", return_value=False):
        response = client.post("/api/auth/forgot-password", json={"email": "student@nie.ac.in"})
        assert response.status_code == 503
        assert "Email delivery service is currently not configured" in response.json()["detail"]

def test_forgot_password_invalid_domain(client):
    with patch("app.routers.auth.is_smtp_configured", return_value=True):
        payload = {"email": "student@gmail.com"}
        response = client.post("/api/auth/forgot-password", json=payload)
        assert response.status_code == 400
        assert "official NIE email address" in response.json()["detail"]

def test_forgot_password_unknown_email(client):
    with patch("app.routers.auth.is_smtp_configured", return_value=True), \
         patch("app.routers.auth.send_password_reset_email") as mock_send:
        payload = {"email": "unknown_student@nie.ac.in"}
        response = client.post("/api/auth/forgot-password", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "If an account matches the details provided" in data["message"]
        # Must never return any token or link to client
        assert "dev_reset_token" not in data
        assert "token" not in data
        mock_send.assert_not_called()

def test_forgot_password_valid_user_and_reset_flow(client, db_session, test_user):
    dispatched_links = []

    def mock_email_sender(to_email, recipient_name, reset_link):
        dispatched_links.append(reset_link)

    with patch("app.routers.auth.is_smtp_configured", return_value=True), \
         patch("app.routers.auth.send_password_reset_email", side_effect=mock_email_sender):
        payload = {"email": test_user.email}
        response = client.post("/api/auth/forgot-password", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "If an account matches the details provided" in data["message"]
        # Never leak tokens in the API response
        assert "dev_reset_token" not in data
        assert "token" not in data
        assert len(dispatched_links) == 1

        # Extract token from the dispatched email link
        link = dispatched_links[0]
        assert "reset-password?token=" in link
        token = link.split("token=")[-1]
        assert len(token) > 20

    # Verify SHA-256 hash was stored in the database, not raw token
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    db_token = db_session.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()
    assert db_token is not None
    assert db_token.used is False

    # Submit reset password with new 8+ character password
    new_pw = "NewSecurePassword@2026"
    rp_res = client.post("/api/auth/reset-password", json={"token": token, "new_password": new_pw})
    assert rp_res.status_code == 200
    assert "updated successfully" in rp_res.json()["message"]

    # Verify token is now marked as used in database
    db_session.refresh(db_token)
    assert db_token.used is True

    # Token reuse MUST fail
    reuse_res = client.post("/api/auth/reset-password", json={"token": token, "new_password": "AnotherPassword@123"})
    assert reuse_res.status_code == 400
    assert "Invalid or already used" in reuse_res.json()["detail"]

    # Verify old password fails
    old_login = client.post("/api/auth/login", json={"email": test_user.email, "password": "Password@123"})
    assert old_login.status_code == 401

    # Verify new password succeeds
    new_login = client.post("/api/auth/login", json={"email": test_user.email, "password": new_pw})
    assert new_login.status_code == 200

def test_reset_password_expired_token(client, db_session, test_user):
    expired_raw = "expired_raw_test_token_1234567890"
    token_hash = hashlib.sha256(expired_raw.encode("utf-8")).hexdigest()
    expired_record = PasswordResetToken(
        user_id=test_user.user_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        used=False,
    )
    db_session.add(expired_record)
    db_session.commit()

    response = client.post("/api/auth/reset-password", json={"token": expired_raw, "new_password": "NewPassword@123"})
    assert response.status_code == 400
    assert "has expired" in response.json()["detail"]

def test_reset_password_invalid_token(client):
    response = client.post("/api/auth/reset-password", json={"token": "nonexistent_token_value", "new_password": "NewPassword@123"})
    assert response.status_code == 400
    assert "Invalid or already used" in response.json()["detail"]

def test_reset_password_missing_token(client):
    response = client.post("/api/auth/reset-password", json={"token": "", "new_password": "NewPassword@123"})
    assert response.status_code == 400
    assert "token is required" in response.json()["detail"]

def test_reset_password_short_password(client):
    response = client.post("/api/auth/reset-password", json={"token": "some_token", "new_password": "short"})
    assert response.status_code == 400
    assert "at least 8 characters" in response.json()["detail"]
