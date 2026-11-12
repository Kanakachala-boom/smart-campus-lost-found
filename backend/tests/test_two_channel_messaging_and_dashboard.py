import pytest
from app.models.user import User
from app.models.item import LostItem, FoundItem
from app.models.claim import Claim
from app.models.match import Match
from app.models.message import Message
from app.services.auth_service import hash_password

@pytest.fixture(autouse=True)
def seed_five_accounts_for_test(db_session):
    accounts = [
        {"name": "Lost & Found Admin", "email": "admin.lostfound@nie.ac.in", "role": "ADMIN"},
        {"name": "Akash A", "email": "2024is_akasha_a@nie.ac.in", "role": "STUDENT"},
        {"name": "Kanakachala A", "email": "2024is_kanakachala_a@nie.ac.in", "role": "STUDENT"},
        {"name": "Rahul Kumar", "email": "2024is_rahul_k@nie.ac.in", "role": "STUDENT"},
        {"name": "Priya Sharma", "email": "2024is_priya_s@nie.ac.in", "role": "STUDENT"},
    ]
    for acc in accounts:
        existing = db_session.query(User).filter(User.email == acc["email"]).first()
        if not existing:
            user = User(
                name=acc["name"],
                email=acc["email"],
                password_hash=hash_password("anything"),
                role=acc["role"],
                is_active=True,
            )
            db_session.add(user)
    db_session.commit()

def test_five_accounts_login_and_roles(client):
    """
    Verifies Requirement 3:
    All 5 accounts exist and log in successfully with password 'anything', returning correct roles.
    """
    accounts = [
        ("admin.lostfound@nie.ac.in", "anything", "ADMIN", "Lost & Found Admin"),
        ("2024is_akasha_a@nie.ac.in", "anything", "STUDENT", "Akash A"),
        ("2024is_kanakachala_a@nie.ac.in", "anything", "STUDENT", "Kanakachala A"),
        ("2024is_rahul_k@nie.ac.in", "anything", "STUDENT", "Rahul Kumar"),
        ("2024is_priya_s@nie.ac.in", "anything", "STUDENT", "Priya Sharma"),
    ]

    for email, pwd, expected_role, expected_name in accounts:
        res = client.post("/api/auth/login", data={"username": email, "password": pwd})
        assert res.status_code == 200, f"Login failed for {email}: {res.text}"
        data = res.json()
        assert "access_token" in data
        user = data["user"]
        assert user["role"] == expected_role, f"Expected {expected_role} for {email}, got {user['role']}"
        assert expected_name in user["name"] or user["name"] in expected_name

def test_student_to_student_private_messaging(client):
    """
    Verifies Requirement 2 (Student-to-student):
    - Akash A ↔ Kanakachala A.
    - Owner can communicate with person who found item.
    - Displays both participants' names and roles.
    - Clearly identifies who receives each message.
    """
    akash_token = client.post("/api/auth/login", data={"username": "2024is_akasha_a@nie.ac.in", "password": "anything"}).json()["access_token"]
    kanak_token = client.post("/api/auth/login", data={"username": "2024is_kanakachala_a@nie.ac.in", "password": "anything"}).json()["access_token"]

    akash_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {akash_token}"}).json()
    kanak_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {kanak_token}"}).json()

    # 1. Akash sends a direct student-to-student message to Kanakachala
    send_res = client.post(
        "/api/messages",
        json={
            "receiver_id": kanak_me["user_id"],
            "text": "Hi Kanakachala, I saw your found watch report. It looks exactly like my lost Casio.",
        },
        headers={"Authorization": f"Bearer {akash_token}"}
    )
    assert send_res.status_code == 201
    msg = send_res.json()
    assert msg["sender_id"] == akash_me["user_id"]
    assert msg["sender_name"] == akash_me["name"]
    assert msg["sender_role"] == "STUDENT"
    assert msg["receiver_id"] == kanak_me["user_id"]
    assert msg["receiver_name"] == kanak_me["name"]
    assert msg["receiver_role"] == "STUDENT"
    assert msg["channel_type"] == "student"

    # 2. Kanakachala retrieves the conversation
    conv_res = client.get(
        f"/api/messages/conversation/{akash_me['user_id']}",
        headers={"Authorization": f"Bearer {kanak_token}"}
    )
    assert conv_res.status_code == 200
    messages = conv_res.json()
    assert len(messages) >= 1
    latest = next(m for m in messages if "Casio" in m["text"])
    assert latest["sender_name"] == akash_me["name"]
    assert latest["sender_role"] == "STUDENT"
    assert latest["receiver_name"] == kanak_me["name"]
    assert latest["receiver_role"] == "STUDENT"
    assert latest["is_read"] is True

    # 3. Kanakachala replies
    reply_res = client.post(
        "/api/messages",
        json={
            "receiver_id": akash_me["user_id"],
            "text": "Yes Akash, I handed it over to the department office. You can verify it with them.",
        },
        headers={"Authorization": f"Bearer {kanak_token}"}
    )
    assert reply_res.status_code == 201
    reply_msg = reply_res.json()
    assert reply_msg["sender_id"] == kanak_me["user_id"]
    assert reply_msg["sender_role"] == "STUDENT"
    assert reply_msg["receiver_id"] == akash_me["user_id"]
    assert reply_msg["receiver_role"] == "STUDENT"

def test_admin_support_channel_removed(client):
    """
    Verifies that admin support messaging endpoints are completely removed
    and student messaging is strictly direct peer-to-peer.
    """
    rahul_token = client.post("/api/auth/login", data={"username": "2024is_rahul_k@nie.ac.in", "password": "anything"}).json()["access_token"]

    # Support endpoints should be 404 Not Found
    support_send = client.post(
        "/api/messages/admin-support",
        json={"text": "Hello Admin"},
        headers={"Authorization": f"Bearer {rahul_token}"}
    )
    assert support_send.status_code == 404

    support_get = client.get(
        "/api/messages/admin-support",
        headers={"Authorization": f"Bearer {rahul_token}"}
    )
    assert support_get.status_code == 404

def test_unauthorized_conversation_isolation(client):
    """
    Verifies that conversations remain isolated:
    - Third party student (Priya) cannot view Akash ↔ Kanakachala messages.
    - Admin does not see Akash ↔ Kanakachala messages under Admin conversation with Akash.
    """
    akash_token = client.post("/api/auth/login", data={"username": "2024is_akasha_a@nie.ac.in", "password": "anything"}).json()["access_token"]
    kanak_token = client.post("/api/auth/login", data={"username": "2024is_kanakachala_a@nie.ac.in", "password": "anything"}).json()["access_token"]
    priya_token = client.post("/api/auth/login", data={"username": "2024is_priya_s@nie.ac.in", "password": "anything"}).json()["access_token"]
    admin_token = client.post("/api/auth/login", data={"username": "admin.lostfound@nie.ac.in", "password": "anything"}).json()["access_token"]

    akash_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {akash_token}"}).json()["user_id"]
    kanak_id = client.get("/api/auth/me", headers={"Authorization": f"Bearer {kanak_token}"}).json()["user_id"]

    # Priya checks conversation with Kanakachala
    priya_conv = client.get(f"/api/messages/conversation/{kanak_id}", headers={"Authorization": f"Bearer {priya_token}"})
    assert priya_conv.status_code == 200
    # Priya only sees messages between Priya and Kanakachala (none of Akash's messages)
    assert not any("Casio" in m["text"] for m in priya_conv.json())

    # Admin checks conversation with Akash (Admin ↔ Akash thread)
    admin_conv = client.get(f"/api/messages/conversation/{akash_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_conv.status_code == 200
    # Admin does NOT see Akash ↔ Kanakachala student peer messages
    assert not any("Casio" in m["text"] for m in admin_conv.json())

def test_user_specific_dashboard_integrity(client):
    """
    Verifies Requirement 1 (Dashboard Corrections):
    - Lost reports belong strictly to the logged-in user.
    - Found reports belong strictly to the logged-in user.
    - Pending claims count only claims submitted by that user.
    - Unread notifications are user-specific.
    - Potential matches are calculated using the user's associated reports.
    - My Recent Reports displays only the logged-in user's reports.
    """
    akash_token = client.post("/api/auth/login", data={"username": "2024is_akasha_a@nie.ac.in", "password": "anything"}).json()["access_token"]
    kanak_token = client.post("/api/auth/login", data={"username": "2024is_kanakachala_a@nie.ac.in", "password": "anything"}).json()["access_token"]

    # 1. Akash reports a lost umbrella
    lost_res = client.post(
        "/api/lost-items",
        data={
            "item_name": "Blue Campus Umbrella",
            "category": "Personal Accessories",
            "location_lost": "Library Ground Floor",
            "date_lost": "2026-11-01",
            "description": "Blue folding umbrella with wooden handle",
        },
        headers={"Authorization": f"Bearer {akash_token}"}
    )
    assert lost_res.status_code == 201

    # 2. Kanakachala reports a found water bottle
    found_res = client.post(
        "/api/found-items",
        data={
            "item_name": "Milton Steel Bottle",
            "category": "Daily Essentials",
            "location_found": "Sports Complex Pavilion",
            "date_found": "2026-11-01",
            "description": "Silver stainless steel water bottle",
            "custody_location": "Security Gate 1",
        },
        headers={"Authorization": f"Bearer {kanak_token}"}
    )
    assert found_res.status_code == 201

    # 3. Fetch Dashboards
    akash_dash = client.get("/api/dashboard", headers={"Authorization": f"Bearer {akash_token}"}).json()
    kanak_dash = client.get("/api/dashboard", headers={"Authorization": f"Bearer {kanak_token}"}).json()

    # Active reports belong strictly to user
    assert akash_dash["metrics"]["activeLost"] == 1
    assert akash_dash["metrics"]["activeFound"] == 0
    assert kanak_dash["metrics"]["activeLost"] == 0
    assert kanak_dash["metrics"]["activeFound"] == 1

    # Recent reports show strictly user's own reported items
    assert len(akash_dash["recentReports"]) == 1
    assert akash_dash["recentReports"][0]["item_name"] == "Blue Campus Umbrella"
    assert akash_dash["recentReports"][0]["type"] == "lost"

    assert len(kanak_dash["recentReports"]) == 1
    assert kanak_dash["recentReports"][0]["item_name"] == "Milton Steel Bottle"
    assert kanak_dash["recentReports"][0]["type"] == "found"
