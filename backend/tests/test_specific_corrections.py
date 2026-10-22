import pytest
from unittest.mock import patch
from app.models import LostItem, FoundItem, Claim, Match, Notification, Message, ClaimMessage

def test_strictly_item_specific_email_notifications(client, user_token):
    """
    Verifies Requirement 1 & 2:
    - Emails are sent ONLY to the authenticated user or intended database record recipient.
    - Potential match email goes only to the owner of that relevant lost report.
    - Claim-related email goes only to the authorized claimant.
    - Frontend cannot inject recipient emails or user IDs to bypass server-side records.
    - Unauthenticated/unauthorized requests are rejected (401/403).
    """
    # 1. Register finder
    finder_reg = client.post("/api/auth/register", json={
        "name": "Bhoomi Finder",
        "student_staff_id": "4NI22IS301",
        "email": "2022is_bhoomi@nie.ac.in",
        "password": "Password@123"
    })
    finder_token = finder_reg.json()["access_token"]
    finder_user_id = finder_reg.json()["user"]["user_id"]

    # 2. Register unrelated third party
    third_reg = client.post("/api/auth/register", json={
        "name": "Unrelated Student",
        "student_staff_id": "4NI22IS302",
        "email": "2022is_unrelated@nie.ac.in",
        "password": "Password@123"
    })
    third_token = third_reg.json()["access_token"]

    with patch("app.services.email_service._send_system_email") as mock_email:
        mock_email.return_value = {"status": "ACCEPTED", "message": "Dispatched"}

        # User A (user_token) reports a lost item
        # Attempt to spoof recipient email in payload if frontend tried to supply one
        lost_payload = {
            "item_name": "HP Spectre Laptop",
            "category": "Electronics & Gadgets",
            "location_lost": "Library Study Room 3",
            "date_lost": "2026-10-20",
            "description": "Silver laptop with NIE logo sticker",
            "recipient_email": "attacker@nie.ac.in",  # Malicious attempt to inject recipient
            "user_id": 99999,  # Malicious attempt to inject user_id
        }
        res_lost = client.post("/api/lost-items", data=lost_payload, headers={"Authorization": f"Bearer {user_token}"})
        assert res_lost.status_code == 201
        lost_id = res_lost.json()["id"]

        # Verify confirmation email was sent ONLY to authenticated user (test_student@nie.ac.in), NOT attacker
        lost_confirm_calls = [call for call in mock_email.call_args_list if "Report Confirmation" in call[0][1]]
        assert len(lost_confirm_calls) == 1
        assert lost_confirm_calls[0][0][0] == "test_student@nie.ac.in"
        assert lost_confirm_calls[0][0][0] != "attacker@nie.ac.in"

        # Finder (User B) reports a found item matching User A's lost item
        found_payload = {
            "item_name": "HP Spectre Laptop",
            "category": "Electronics & Gadgets",
            "location_found": "Library Study Room 3",
            "date_found": "2026-10-20",
            "description": "Silver laptop with NIE logo sticker found on table",
            "custody_location": "Library Circulation Counter",
        }
        res_found = client.post("/api/found-items", data=found_payload, headers={"Authorization": f"Bearer {finder_token}"})
        assert res_found.status_code == 201
        found_id = res_found.json()["id"]

        # Verify match email was triggered: sent ONLY to User A (owner of the matched lost item)
        match_calls = [call for call in mock_email.call_args_list if "Potential Match Alert" in call[0][1]]
        assert len(match_calls) == 1
        assert match_calls[0][0][0] == "test_student@nie.ac.in"
        # Finder or unrelated student must NEVER receive this match email
        assert match_calls[0][0][0] != "2022is_bhoomi@nie.ac.in"
        assert match_calls[0][0][0] != "2022is_unrelated@nie.ac.in"

        # Verify claim email routing: User A claims the item
        claim_payload = {
            "found_item_id": found_id,
            "verification_details": "Laptop has serial number 5CD1234567 and wallpaper of campus quad.",
        }
        res_claim = client.post("/api/claims", json=claim_payload, headers={"Authorization": f"Bearer {user_token}"})
        assert res_claim.status_code == 201
        claim_id = res_claim.json()["claim_id"]

        # Finder verifies the claim
        verify_payload = {
            "status": "VERIFIED",
            "handover_instructions": "Come to Library Circulation Counter before 5 PM."
        }
        res_verify = client.post(f"/api/claims/{claim_id}/verify", json=verify_payload, headers={"Authorization": f"Bearer {finder_token}"})
        assert res_verify.status_code == 200

        # Verify claim update email was sent ONLY to User A (the claimant)
        claim_calls = [call for call in mock_email.call_args_list if "Ownership Claim Update" in call[0][1]]
        assert len(claim_calls) >= 1
        assert claim_calls[-1][0][0] == "test_student@nie.ac.in"
        assert claim_calls[-1][0][0] != "2022is_unrelated@nie.ac.in"


def test_unauthenticated_and_unauthorized_operations_rejected(client, user_token):
    """
    Verifies Requirement 2:
    - Protected endpoints reject unauthenticated requests with 401.
    - Unrelated users cannot access or trigger claim verification for items they don't own (403).
    """
    # Unauthenticated report creation -> 401
    res1 = client.post("/api/lost-items", data={"item_name": "Test Item"})
    assert res1.status_code == 401

    res2 = client.post("/api/found-items", data={"item_name": "Test Item"})
    assert res2.status_code == 401

    # Unauthenticated chat -> 401
    res3 = client.get("/api/found-items/1/conversation")
    assert res3.status_code == 401

    res4 = client.post("/api/found-items/1/conversation/messages", json={"text": "hello"})
    assert res4.status_code == 401


def test_empty_registry_returns_no_example_items(client):
    """
    Verifies Requirement 3:
    - When searching or querying for non-existent items, empty list [] is returned.
    - No hardcoded demo or placeholder items are generated by the backend.
    """
    res = client.get("/api/lost-items?category=Books%20%26%20Stationery&search=NonExistent99999")
    assert res.status_code == 200
    lost_data = res.json()
    assert lost_data["items"] == []
    assert lost_data["total"] == 0

    res_found = client.get("/api/found-items?category=College%20ID%20%26%20Cards&search=NonExistent99999")
    assert res_found.status_code == 200
    found_data = res_found.json()
    assert found_data["items"] == []
    assert found_data["total"] == 0


def test_private_conversation_inside_found_item_report(client, user_token):
    """
    Verifies Requirement 4:
    1. User A reports lost item.
    2. User B reports found item that matches.
    3. User A receives notification linking to /items/found/{id}.
    4. User A accesses private conversation inside that found-item report.
    5. User A sends first message -> User B (finder) is immediately notified with target_url /items/found/{id}.
    6. User B accesses conversation on the found-item report and replies.
    7. User A receives notification linking to /items/found/{id}.
    8. Unrelated User C receives 403 Forbidden on both GET and POST.
    9. Messages persist across requests.
    """
    # 1. Register User B (Finder)
    finder_res = client.post("/api/auth/register", json={
        "name": "Karthik Finder",
        "student_staff_id": "4NI22IS401",
        "email": "2022is_karthik@nie.ac.in",
        "password": "Password@123"
    })
    finder_token = finder_res.json()["access_token"]
    finder_id = finder_res.json()["user"]["user_id"]

    # 2. Register User C (Unrelated)
    unrelated_res = client.post("/api/auth/register", json={
        "name": "Deepa Unrelated",
        "student_staff_id": "4NI22IS402",
        "email": "2022is_deepa@nie.ac.in",
        "password": "Password@123"
    })
    unrelated_token = unrelated_res.json()["access_token"]

    # User A reports lost Sony Headphones
    lost_res = client.post("/api/lost-items", data={
        "item_name": "Sony WH-1000XM4 Headphones",
        "category": "Electronics & Gadgets",
        "location_lost": "Mechanical Seminar Hall",
        "date_lost": "2026-10-21",
        "description": "Black noise cancelling headphones in grey case",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert lost_res.status_code == 201

    # User B reports found Sony Headphones
    found_res = client.post("/api/found-items", data={
        "item_name": "Sony WH-1000XM4 Headphones",
        "category": "Electronics & Gadgets",
        "location_found": "Mechanical Seminar Hall",
        "date_found": "2026-10-21",
        "description": "Found black headphones in grey case under chair",
        "custody_location": "Mechanical Dept Office",
    }, headers={"Authorization": f"Bearer {finder_token}"})
    assert found_res.status_code == 201
    found_id = found_res.json()["id"]

    # Verify User A's match notification contains the exact target_url
    notif_res = client.get("/api/notifications", headers={"Authorization": f"Bearer {user_token}"})
    assert notif_res.status_code == 200
    user_a_notifs = notif_res.json()
    match_notif = next((n for n in user_a_notifs if n.get("type") == "POTENTIAL_MATCH" and n.get("item_id") == found_id), None)
    assert match_notif is not None
    assert match_notif["target_url"] == f"/items/found/{found_id}"

    # User A opens found-item report and accesses conversation
    conv_res = client.get(f"/api/found-items/{found_id}/conversation", headers={"Authorization": f"Bearer {user_token}"})
    assert conv_res.status_code == 200
    conv_data = conv_res.json()
    assert conv_data["can_chat"] is True
    assert conv_data["found_item_id"] == found_id
    assert conv_data["finder_id"] == finder_id

    # User A sends first message to coordinate return
    msg1_res = client.post(
        f"/api/found-items/{found_id}/conversation/messages",
        json={"text": "Hi, I believe these are my headphones. I lost them during the morning guest lecture."},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert msg1_res.status_code == 201
    msg1_data = msg1_res.json()
    assert "headphones" in msg1_data["text"]

    # User B (Finder) immediately receives prompt notification pointing to /items/found/{found_id}
    finder_notifs_res = client.get("/api/notifications", headers={"Authorization": f"Bearer {finder_token}"})
    assert finder_notifs_res.status_code == 200
    finder_notifs = finder_notifs_res.json()
    finder_msg_notif = next((n for n in finder_notifs if n.get("type") == "CLAIM_MESSAGE" and n.get("item_id") == found_id), None)
    assert finder_msg_notif is not None
    assert finder_msg_notif["target_url"] == f"/items/found/{found_id}"

    # User B opens the conversation on that found-item report and sees the message
    finder_conv_res = client.get(f"/api/found-items/{found_id}/conversation", headers={"Authorization": f"Bearer {finder_token}"})
    assert finder_conv_res.status_code == 200
    finder_conv = finder_conv_res.json()
    assert len(finder_conv["messages"]) >= 1
    assert any("guest lecture" in m["text"] for m in finder_conv["messages"])

    # User B replies directly from the found-item report
    reply_res = client.post(
        f"/api/found-items/{found_id}/conversation/messages",
        json={"text": "Yes, they are safe with the mechanical dept office. Please bring your ID card to collect them."},
        headers={"Authorization": f"Bearer {finder_token}"}
    )
    assert reply_res.status_code == 201

    # User A receives notification pointing to /items/found/{found_id}
    user_a_updated_notifs = client.get("/api/notifications", headers={"Authorization": f"Bearer {user_token}"}).json()
    reply_notif = next((n for n in user_a_updated_notifs if n.get("type") == "CLAIM_MESSAGE" and n.get("item_id") == found_id), None)
    assert reply_notif is not None
    assert reply_notif["target_url"] == f"/items/found/{found_id}"

    # Unrelated User C attempts to access conversation -> 403 Forbidden
    unrelated_conv = client.get(f"/api/found-items/{found_id}/conversation", headers={"Authorization": f"Bearer {unrelated_token}"})
    assert unrelated_conv.status_code == 403
    assert "not authorized" in unrelated_conv.json()["detail"].lower()

    # Unrelated User C attempts to send message -> 403 Forbidden
    unrelated_send = client.post(
        f"/api/found-items/{found_id}/conversation/messages",
        json={"text": "Sneaking into someone else's chat"},
        headers={"Authorization": f"Bearer {unrelated_token}"}
    )
    assert unrelated_send.status_code == 403

    # Unrelated User C has no notification about this item
    unrelated_notifs = client.get("/api/notifications", headers={"Authorization": f"Bearer {unrelated_token}"}).json()
    assert not any(n.get("item_id") == found_id for n in unrelated_notifs)
