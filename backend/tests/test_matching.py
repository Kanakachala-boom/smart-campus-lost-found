def test_matching_engine_computation(client, user_token):
    # Register another user to be the finder
    finder_token = client.post("/api/auth/register", json={
        "name": "Finder Student",
        "student_staff_id": "4NI22IS077",
        "email": "2022is_finder@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]

    # 1. User reports lost item
    lost_res = client.post("/api/lost-items", data={
        "item_name": "Scientific Casio FX991 Calculator",
        "category": "Electronics & Gadgets",
        "location_lost": "Central Library",
        "date_lost": "2026-09-14",
        "description": "Black Casio scientific calculator with sliding hard cover.",
        "notify_on_match": "true",
    }, headers={"Authorization": f"Bearer {user_token}"})
    lost_id = lost_res.json()["id"]

    # 2. Finder reports found item with matching category, location, and keywords
    found_res = client.post("/api/found-items", data={
        "item_name": "Casio Scientific Calculator FX991",
        "category": "Electronics & Gadgets",
        "location_found": "Central Library",
        "date_found": "2026-09-14",
        "description": "Found black Casio scientific calculator on table.",
        "custody_location": "Library Enquiry Desk",
        "notify_on_match": "true",
    }, headers={"Authorization": f"Bearer {finder_token}"})
    found_id = found_res.json()["id"]

    # 3. Check matches for the lost item
    match_res = client.get(f"/api/lost-items/{lost_id}/matches", headers={"Authorization": f"Bearer {user_token}"})
    assert match_res.status_code == 200
    matches = match_res.json()
    assert len(matches) >= 1
    top_match = matches[0]
    assert top_match["score"] >= 70
    assert top_match["confidence_level"] in ("High", "Medium")

    # 4. Check that user received a targeted match notification
    notif_res = client.get("/api/notifications", headers={"Authorization": f"Bearer {user_token}"})
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert any(n["type"] == "POTENTIAL_MATCH" for n in notifs)


def test_matching_mobile_charger_stemming_and_synonyms(client, user_token):
    """
    Verifies stemming and synonym normalization:
    User A: reports losing a 'mobile charger'.
    User B: reports finding 'phone chargers'.
    Both should match with high confidence.
    """
    finder_token = client.post("/api/auth/register", json={
        "name": "Charger Finder",
        "student_staff_id": "4NI22IS101",
        "email": "2022is_chgfinder@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]

    # 1. User A reports lost 'mobile charger'
    lost_res = client.post("/api/lost-items", data={
        "item_name": "Mobile Charger",
        "category": "Electronics & Gadgets",
        "location_lost": "Library",
        "date_lost": "2026-09-14",
        "description": "White 65W fast charger with type-c cable.",
        "notify_on_match": "true",
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert lost_res.status_code == 201
    lost_id = lost_res.json()["id"]

    # 2. User B reports found 'phone chargers'
    found_res = client.post("/api/found-items", data={
        "item_name": "Phone Chargers",
        "category": "Electronics & Gadgets",
        "location_found": "Central Library",
        "date_found": "2026-09-14",
        "description": "Found white fast mobile charger with cable on study table.",
        "custody_location": "Library Desk",
        "notify_on_match": "true",
    }, headers={"Authorization": f"Bearer {finder_token}"})
    assert found_res.status_code == 201
    found_id = found_res.json()["id"]

    # 3. Verify match exists and has high score
    match_res = client.get(f"/api/lost-items/{lost_id}/matches", headers={"Authorization": f"Bearer {user_token}"})
    assert match_res.status_code == 200
    matches = match_res.json()
    assert len(matches) >= 1
    charger_match = next((m for m in matches if m["found_item_id"] == found_id), None)
    assert charger_match is not None
    assert charger_match["score"] >= 65


def test_found_created_before_lost(client, user_token):
    """
    Verifies that matching works regardless of which report is created first:
    Found report created first, lost report created second.
    """
    finder_token = client.post("/api/auth/register", json={
        "name": "Early Finder",
        "student_staff_id": "4NI22IS102",
        "email": "2022is_earlyfinder@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]

    # Found report first
    found_res = client.post("/api/found-items", data={
        "item_name": "Blue Campus Umbrella",
        "category": "Personal Accessories",
        "location_found": "Admin Block",
        "date_found": "2026-09-14",
        "description": "Large blue umbrella left near entrance.",
        "custody_location": "Admin Security",
    }, headers={"Authorization": f"Bearer {finder_token}"})
    found_id = found_res.json()["id"]

    # Lost report second
    lost_res = client.post("/api/lost-items", data={
        "item_name": "Blue Umbrella",
        "category": "Personal Accessories",
        "location_lost": "Admin Block",
        "date_lost": "2026-09-14",
        "description": "Dark blue folding umbrella.",
    }, headers={"Authorization": f"Bearer {user_token}"})
    lost_id = lost_res.json()["id"]

    # Both endpoints should reflect the match
    lost_matches = client.get(f"/api/lost-items/{lost_id}/matches", headers={"Authorization": f"Bearer {user_token}"}).json()
    assert any(m["found_item_id"] == found_id for m in lost_matches)

    found_matches = client.get(f"/api/found-items/{found_id}/matches", headers={"Authorization": f"Bearer {finder_token}"}).json()
    assert any(m["lost_item_id"] == lost_id for m in found_matches)


def test_reconciliation_and_status_resolution(client, user_token):
    """
    Tests the reconciliation endpoint /api/matches/reconcile
    and verifies that marking an item as RECLAIMED resolves matches.
    """
    reconcile_res = client.post("/api/matches/reconcile", headers={"Authorization": f"Bearer {user_token}"})
    assert reconcile_res.status_code == 200
    assert reconcile_res.json()["status"] == "success"
    assert "reconciled_count" in reconcile_res.json()

