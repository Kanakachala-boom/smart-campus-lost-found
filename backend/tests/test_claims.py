def test_claim_submission_and_verification_flow(client, user_token, admin_token):
    # 1. Admin/Finder creates a found item
    found_res = client.post("/api/found-items", data={
        "item_name": "Set of Bike Keys",
        "category": "Keys",
        "location_found": "Mechanical Block Parking",
        "date_found": "2026-09-15",
        "description": "Keys on ring with blue tag.",
        "custody_location": "Security Desk",
    }, headers={"Authorization": f"Bearer {admin_token}"})
    found_id = found_res.json()["id"]

    # 2. Check challenge prompt
    chal_res = client.get(f"/api/found-items/{found_id}/verification-challenge")
    assert chal_res.status_code == 200
    assert "challenge_prompt" in chal_res.json()

    # 3. User submits claim
    claim_payload = {
        "found_item_id": found_id,
        "verification_details": "One key is a Hero Splendor key with scratch on rubber grip.",
        "lost_date": "2026-09-15",
        "lost_location": "Mechanical Block Parking",
        "claimant_answer": "Hero Splendor key with scratch",
    }
    claim_res = client.post("/api/claims", json=claim_payload, headers={"Authorization": f"Bearer {user_token}"})
    assert claim_res.status_code == 201
    claim_data = claim_res.json()
    assert claim_data["status"] == "PENDING"
    claim_id = claim_data["claim_id"]

    # 4. User views their claims
    my_claims_res = client.get("/api/claims/my-claims", headers={"Authorization": f"Bearer {user_token}"})
    assert my_claims_res.status_code == 200
    assert any(c["claim_id"] == claim_id for c in my_claims_res.json())

    # 5. Admin verifies the claim
    verify_payload = {
        "status": "VERIFIED",
        "handover_instructions": "Collect from Security Office between 10am-4pm.",
    }
    verify_res = client.post(f"/api/claims/{claim_id}/verify", json=verify_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert verify_res.status_code == 200

    # 6. Check that item status changed to RETURNED
    item_res = client.get(f"/api/found-items/{found_id}")
    assert item_res.status_code == 200
    assert item_res.json()["status"] == "RETURNED"

    # 7. Check claimant received verification notification
    notif_res = client.get("/api/notifications", headers={"Authorization": f"Bearer {user_token}"})
    assert any(n["type"] == "CLAIM_VERIFIED" for n in notif_res.json())


def test_claim_validation_rules_and_messaging(client, user_token):
    # Register finder
    finder_token = client.post("/api/auth/register", json={
        "name": "Found Items Reporter",
        "student_staff_id": "4NI22IS201",
        "email": "2022is_finder2@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]

    # Register an unrelated student
    other_token = client.post("/api/auth/register", json={
        "name": "Unrelated Student",
        "student_staff_id": "4NI22IS202",
        "email": "2022is_other2@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]

    # 1. Finder reports found item
    found_res = client.post("/api/found-items", data={
        "item_name": "Spectacles in Black Case",
        "category": "Personal Accessories",
        "location_found": "GJ Block 2nd Floor",
        "date_found": "2026-09-15",
        "description": "Black Ray-Ban spectacles.",
        "custody_location": "Security Desk",
    }, headers={"Authorization": f"Bearer {finder_token}"})
    found_id = found_res.json()["id"]

    # 2. Finder attempts to claim their own found item -> 400
    self_claim = client.post("/api/claims", json={
        "found_item_id": found_id,
        "verification_details": "My own spectacles",
    }, headers={"Authorization": f"Bearer {finder_token}"})
    assert self_claim.status_code == 400
    assert "cannot submit an ownership claim" in self_claim.json()["detail"].lower()

    # 3. User submits valid claim
    valid_claim = client.post("/api/claims", json={
        "found_item_id": found_id,
        "verification_details": "Ray-ban prescription -1.5 with metallic hinges",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert valid_claim.status_code == 201
    claim_id = valid_claim.json()["claim_id"]

    # 4. User attempts duplicate claim -> 400
    dup_claim = client.post("/api/claims", json={
        "found_item_id": found_id,
        "verification_details": "Duplicate claim attempt",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert dup_claim.status_code == 400
    assert "already have an active" in dup_claim.json()["detail"].lower()

    # 5. Finder inspects incoming claims on their found item
    finder_claims = client.get(f"/api/found-items/{found_id}/claims", headers={"Authorization": f"Bearer {finder_token}"})
    assert finder_claims.status_code == 200
    assert any(c["claim_id"] == claim_id for c in finder_claims.json())

    # 6. Unrelated student tries to view finder's claims -> 403
    other_claims = client.get(f"/api/found-items/{found_id}/claims", headers={"Authorization": f"Bearer {other_token}"})
    assert other_claims.status_code == 403

    # 7. Claimant sends message on the claim
    msg_send = client.post(f"/api/claims/{claim_id}/messages", json={
        "text": "Hello, I can verify the serial number on the frame.",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert msg_send.status_code == 201
    msg_data = msg_send.json()
    assert msg_data["text"] == "Hello, I can verify the serial number on the frame."

    # 8. Finder reads messages and replies
    msgs = client.get(f"/api/claims/{claim_id}/messages", headers={"Authorization": f"Bearer {finder_token}"})
    assert msgs.status_code == 200
    assert len(msgs.json()) >= 1

    reply = client.post(f"/api/claims/{claim_id}/messages", json={
        "text": "Please bring your ID to the security desk at 3pm.",
    }, headers={"Authorization": f"Bearer {finder_token}"})
    assert reply.status_code == 201

    # 9. Unrelated user tries to view messages -> 403
    unauth_msgs = client.get(f"/api/claims/{claim_id}/messages", headers={"Authorization": f"Bearer {other_token}"})
    assert unauth_msgs.status_code == 403

