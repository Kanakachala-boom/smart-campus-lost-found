def test_full_end_to_end_lifecycle(client):
    # 1. Student A Registers
    reg_a = client.post("/api/auth/register", json={
        "name": "Kanakachala A",
        "student_staff_id": "4NI21IS045",
        "email": "2024is_kanakachala_a@nie.ac.in",
        "phone": "9876543210",
        "password": "Password@123",
    })
    assert reg_a.status_code == 201
    token_a = reg_a.json()["access_token"]
    user_a_id = reg_a.json()["user"]["user_id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Student B Registers
    reg_b = client.post("/api/auth/register", json={
        "name": "Ananya Rao",
        "student_staff_id": "4NI21IS012",
        "email": "2024is_ananya_r@nie.ac.in",
        "phone": "9876543211",
        "password": "Password@123",
    })
    assert reg_b.status_code == 201
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Admin Registers
    reg_adm = client.post("/api/auth/register", json={
        "name": "Prof. S. N. Murthy (Admin)",
        "student_staff_id": "NIE-STAFF-001",
        "email": "admin@nie.ac.in",
        "phone": "9876543212",
        "password": "Password@123",
    })
    assert reg_adm.status_code == 201
    token_adm = reg_adm.json()["access_token"]
    assert reg_adm.json()["user"]["role"] == "ADMIN"
    headers_adm = {"Authorization": f"Bearer {token_adm}"}

    # 4. Student A reports a lost HP Calculator in Central Library
    lost_item_res = client.post("/api/lost-items", data={
        "item_name": "HP Scientific Calculator 300s+",
        "category": "Electronics & Gadgets",
        "location_lost": "Central Library",
        "specific_location": "2nd floor reference section table 5",
        "date_lost": "2026-09-15",
        "time_lost": "Morning (9:00 AM – 12:00 PM)",
        "description": "Black HP scientific calculator with protective cover.",
        "identifying_marks": "Initials KA engraved on back battery cover.",
        "notify_on_match": "true",
    }, headers=headers_a)
    assert lost_item_res.status_code == 201
    lost_id = lost_item_res.json()["id"]

    # 5. Student B reports finding an HP Calculator in Central Library
    found_item_res = client.post("/api/found-items", data={
        "item_name": "HP Scientific Calculator",
        "category": "Electronics & Gadgets",
        "location_found": "Central Library",
        "specific_location": "Reference section",
        "date_found": "2026-09-15",
        "time_found": "Morning (9:00 AM – 12:00 PM)",
        "description": "Black HP calculator found near study desk.",
        "custody_location": "Library Enquiry Desk",
        "contact_preference": "Coordinate Handover via Campus Security / Admin",
        "notify_on_match": "true",
    }, headers=headers_b)
    assert found_item_res.status_code == 201
    found_id = found_item_res.json()["id"]

    # 6. Verify Automated Match was Generated
    matches_res = client.get("/api/matches/my-matches", headers=headers_a)
    assert matches_res.status_code == 200
    matches = matches_res.json()
    assert len(matches) >= 1
    assert matches[0]["lost_item_id"] == lost_id
    assert matches[0]["found_item_id"] == found_id
    assert matches[0]["score"] >= 75
    assert matches[0]["confidence_level"] == "High"

    # 7. Verify Student A received user-specific notification
    notifs_a = client.get("/api/notifications", headers=headers_a).json()
    assert len(notifs_a) >= 1
    assert any(n["type"] == "POTENTIAL_MATCH" and "Calculator" in n["title"] or "Match" in n["title"] for n in notifs_a)

    # 8. Student A Submits an Ownership Claim for the found item
    claim_res = client.post("/api/claims", json={
        "found_item_id": found_id,
        "verification_details": "Initials KA are engraved on the back battery cover in silver ink.",
        "lost_date": "2026-09-15",
        "lost_location": "Central Library",
        "claimant_answer": "KA engraved on battery cover",
    }, headers=headers_a)
    assert claim_res.status_code == 201
    claim_id = claim_res.json()["claim_id"]

    # 9. Verify Student B (finder) received Claim Submitted notification
    notifs_b = client.get("/api/notifications", headers=headers_b).json()
    assert any(n["type"] == "CLAIM_SUBMITTED" for n in notifs_b)

    # 10. In-App Private Chat between Claimant and Finder/Admin
    msg_1 = client.post(f"/api/claims/{claim_id}/messages", json={
        "text": "Hello, I have submitted the proof details for the calculator."
    }, headers=headers_a)
    assert msg_1.status_code == 201

    msg_2 = client.post(f"/api/claims/{claim_id}/messages", json={
        "text": "Thank you Kanakachala, the item is deposited at Library Desk."
    }, headers=headers_b)
    assert msg_2.status_code == 201

    chat_history = client.get(f"/api/claims/{claim_id}/messages", headers=headers_a).json()
    assert len(chat_history) == 2

    # 11. Admin verifies claim and sets handover instructions
    verify_res = client.post(f"/api/claims/{claim_id}/verify", json={
        "status": "VERIFIED",
        "handover_instructions": "Please visit South Campus Security Office with your NIE ID Card.",
    }, headers=headers_adm)
    assert verify_res.status_code == 200

    # 12. Verify item status transitioned to RETURNED
    found_item_after = client.get(f"/api/found-items/{found_id}").json()
    assert found_item_after["status"] == "RETURNED"

    # 13. Verify Claimant received Claim Verified notification
    notifs_a_updated = client.get("/api/notifications", headers=headers_a).json()
    assert any(n["type"] == "CLAIM_VERIFIED" for n in notifs_a_updated)

    # 14. Verify Dashboard Metrics reflect the lifecycle
    dash = client.get("/api/dashboard", headers=headers_a).json()
    assert "metrics" in dash
    assert dash["metrics"]["unreadNotifications"] >= 1
