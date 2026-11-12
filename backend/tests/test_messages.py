import pytest
from app.models.message import Message

def test_send_and_retrieve_private_message(client, user_token):
    # Register recipient student
    rec_res = client.post("/api/auth/register", json={
        "name": "Recipient Student",
        "student_staff_id": "4NI22IS501",
        "email": "2022is_rec501@nie.ac.in",
        "password": "Password@123"
    })
    assert rec_res.status_code == 201
    rec_data = rec_res.json()
    recipient_id = rec_data["user"]["user_id"]
    rec_token = rec_data["access_token"]

    # 1. Authenticated user sends a private message
    send_res = client.post("/api/messages", json={
        "receiver_id": recipient_id,
        "text": "Hello, I think you might have found my lost calculator.",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert send_res.status_code == 201
    msg_data = send_res.json()
    assert msg_data["text"] == "Hello, I think you might have found my lost calculator."
    assert msg_data["receiver_id"] == recipient_id
    assert msg_data["is_read"] is False
    msg_id = msg_data["message_id"]

    # 2. Sender cannot impersonate another user (spoof sender_id)
    spoof_res = client.post("/api/messages", json={
        "sender_id": 9999,
        "receiver_id": recipient_id,
        "text": "Spoofed message test",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert spoof_res.status_code == 201
    assert spoof_res.json()["sender_id"] != 9999

    # 3. Recipient checks conversation history -> marks messages as read
    conv_res = client.get(f"/api/messages/conversation/{msg_data['sender_id']}", headers={"Authorization": f"Bearer {rec_token}"})
    assert conv_res.status_code == 200
    conv = conv_res.json()
    assert len(conv) == 2
    assert conv[0]["message_id"] == msg_id
    assert conv[0]["is_read"] is True

    # 4. Conversations summary check
    summary_res = client.get("/api/messages/conversations", headers={"Authorization": f"Bearer {rec_token}"})
    assert summary_res.status_code == 200
    threads = summary_res.json()
    assert len(threads) >= 1
    target_thread = next(t for t in threads if t["other_user_id"] == msg_data["sender_id"])
    assert target_thread["last_message"] == "Spoofed message test"

    # 5. Recipient received in-app notification
    notifs_res = client.get("/api/notifications", headers={"Authorization": f"Bearer {rec_token}"})
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert any(n["type"] in ("NEW_MESSAGE", "CLAIM_MESSAGE") for n in notifs)

def test_message_validation_and_permissions(client, user_token):
    # Unauthenticated user cannot send message
    unauth_send = client.post("/api/messages", json={
        "receiver_id": 2,
        "text": "Unauthorized message"
    })
    assert unauth_send.status_code == 401

    # Empty message content rejected
    empty_send = client.post("/api/messages", json={
        "receiver_id": 2,
        "text": "   "
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert empty_send.status_code == 400
    assert "cannot be empty" in empty_send.json()["detail"]

    # Missing recipient rejected
    no_rec = client.post("/api/messages", json={
        "text": "No recipient"
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert no_rec.status_code == 400

    # Non-existent recipient rejected
    invalid_rec = client.post("/api/messages", json={
        "receiver_id": 999999,
        "text": "Invalid recipient test"
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert invalid_rec.status_code == 404

    # Cannot message self
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    my_id = me_res.json()["user_id"]
    self_send = client.post("/api/messages", json={
        "receiver_id": my_id,
        "text": "Self message test"
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert self_send.status_code == 400
    assert "Cannot send a private message to yourself" in self_send.json()["detail"]

def test_claim_anchored_messages(client, user_token, admin_token):
    # 1. Admin/Finder creates found item
    found_res = client.post("/api/found-items", data={
        "item_name": "Lost Umbrella",
        "category": "Personal Accessories",
        "location_found": "Auditorium",
        "date_found": "2026-09-18",
        "description": "Blue foldable umbrella.",
    }, headers={"Authorization": f"Bearer {admin_token}"})
    found_id = found_res.json()["id"]

    # 2. User claims it
    claim_res = client.post("/api/claims", json={
        "found_item_id": found_id,
        "verification_details": "Has a small tear on the handle strap.",
    }, headers={"Authorization": f"Bearer {user_token}"})
    claim_id = claim_res.json()["claim_id"]

    # 3. Claimant sends claim message
    c_msg = client.post(f"/api/claims/{claim_id}/messages", json={
        "text": "Hello, when can I collect the umbrella?"
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert c_msg.status_code == 201
    assert c_msg.json()["claim_id"] == claim_id

    # 4. Finder/Admin retrieves claim messages
    admin_get = client.get(f"/api/claims/{claim_id}/messages", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_get.status_code == 200
    msgs = admin_get.json()
    assert len(msgs) == 1
    assert msgs[0]["text"] == "Hello, when can I collect the umbrella?"

    # 5. Unrelated user attempts to access -> 403 Forbidden
    unrelated_token = client.post("/api/auth/register", json={
        "name": "Unrelated User",
        "student_staff_id": "4NI22IS599",
        "email": "2022is_unrelated@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]

    unauth_get = client.get(f"/api/claims/{claim_id}/messages", headers={"Authorization": f"Bearer {unrelated_token}"})
    assert unauth_get.status_code == 403

    unauth_post = client.post(f"/api/claims/{claim_id}/messages", json={
        "text": "Intruder message"
    }, headers={"Authorization": f"Bearer {unrelated_token}"})
    assert unauth_post.status_code == 403
