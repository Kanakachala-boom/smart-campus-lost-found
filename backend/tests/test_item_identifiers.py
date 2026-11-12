import pytest
from app.models.item import LostItem, FoundItem
from app.models.match import Match
from app.models.claim import Claim
from app.models.notification import Notification

def test_distinct_and_overlapping_item_ids(client, user_token, admin_token):
    """
    Verifies that Lost and Found items preserve their distinct primary keys,
    even when IDs happen to have the exact same numeric value or different values.
    """
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Lost Item #1
    lost_1 = client.post("/api/lost-items", data={
        "item_name": "Lost Blue Backpack",
        "category": "Bags & Backpacks",
        "location_lost": "Library Ground Floor",
        "date_lost": "2026-09-20",
        "description": "Navy blue Wildcraft backpack",
    }, headers=headers).json()

    # 2. Create Found Item #1
    found_1 = client.post("/api/found-items", data={
        "item_name": "Found Scientific Calculator",
        "category": "Electronics & Gadgets",
        "location_found": "Auditorium",
        "date_found": "2026-09-20",
        "description": "Casio calculator",
        "custody_location": "Security Office",
    }, headers=admin_headers).json()

    # 3. Create Found Item #2
    found_2 = client.post("/api/found-items", data={
        "item_name": "Found Blue Backpack",
        "category": "Bags & Backpacks",
        "location_found": "Library 1st Floor",
        "date_found": "2026-09-20",
        "description": "Navy blue backpack",
        "custody_location": "Library Desk",
    }, headers=admin_headers).json()

    assert lost_1["type"] == "lost"
    assert lost_1["id"] == lost_1["lost_item_id"]
    assert found_1["type"] == "found"
    assert found_1["id"] == found_1["found_item_id"]
    assert found_2["type"] == "found"
    assert found_2["id"] == found_2["found_item_id"]

    # Verify fetching item details routes to correct table
    lost_res = client.get(f"/api/lost-items/{lost_1['id']}")
    assert lost_res.status_code == 200
    assert lost_res.json()["item_name"] == "Lost Blue Backpack"
    assert lost_res.json()["type"] == "lost"

    found_res = client.get(f"/api/found-items/{found_1['id']}")
    assert found_res.status_code == 200
    assert found_res.json()["item_name"] == "Found Scientific Calculator"
    assert found_res.json()["type"] == "found"

def test_match_preserves_both_item_ids(client, user_token, admin_token, db_session):
    """
    Verifies that a match preserves both lost_item_id and found_item_id,
    and match_id is never confused with an item ID.
    """
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    lost_item = client.post("/api/lost-items", data={
        "item_name": "Dell Laptop Inspiron",
        "category": "Electronics & Gadgets",
        "location_lost": "Computer Lab 3",
        "date_lost": "2026-09-21",
        "description": "Silver Dell laptop with NIE sticker.",
    }, headers=headers).json()

    found_item = client.post("/api/found-items", data={
        "item_name": "Dell Laptop Inspiron 15",
        "category": "Electronics & Gadgets",
        "location_found": "Computer Lab 3",
        "date_found": "2026-09-21",
        "description": "Silver Dell Inspiron laptop found on desk.",
    }, headers=admin_headers).json()

    lost_id = lost_item["id"]
    found_id = found_item["id"]

    # Retrieve matches for the lost item
    match_res = client.get(f"/api/lost-items/{lost_id}/matches", headers=headers)
    assert match_res.status_code == 200
    matches = match_res.json()
    assert len(matches) >= 1
    m = matches[0]

    # Verify match_id is distinct and both item IDs are preserved
    assert m["lost_item_id"] == lost_id
    assert m["found_item_id"] == found_id
    assert m["lost_item"]["id"] == lost_id
    assert m["found_item"]["id"] == found_id
    assert m["match_id"] is not None

def test_claim_references_correct_found_item_and_notification(client, user_token, admin_token):
    """
    Verifies that a claim references the correct found item ID,
    serializes item and found_item consistently, and generates notifications
    that link to the claim_id and not an item ID.
    """
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Admin creates found item
    found_res = client.post("/api/found-items", data={
        "item_name": "Titan Chronograph Watch",
        "category": "Personal Accessories",
        "location_found": "Sports Arena",
        "date_found": "2026-09-22",
        "description": "Black leather strap chronograph.",
        "custody_location": "Security Office",
    }, headers=admin_headers)
    found_id = found_res.json()["id"]

    # 2. User submits claim
    claim_payload = {
        "found_item_id": found_id,
        "verification_details": "Back cover engraved with birthday date 14-Aug.",
        "lost_location": "Sports Arena",
        "lost_date": "2026-09-22",
    }
    claim_res = client.post("/api/claims", json=claim_payload, headers=user_headers)
    assert claim_res.status_code == 201
    claim = claim_res.json()

    assert claim["found_item_id"] == found_id
    assert claim["claim_id"] is not None
    assert claim["item"] is not None
    assert claim["item"]["id"] == found_id
    assert claim["item"]["item_name"] == "Titan Chronograph Watch"
    assert claim["found_item_name"] == "Titan Chronograph Watch"

    # 3. Verify notification links to the claim
    notifs = client.get("/api/notifications", headers=user_headers).json()
    claim_notif = next((n for n in notifs if n["type"] == "CLAIM_SUBMITTED"), None)
    assert claim_notif is not None
    assert claim_notif["target_url"] == f"/claims/{claim['claim_id']}"

    # 4. Admin verifies the claim -> notification links to claim_id
    verify_res = client.post(f"/api/claims/{claim['claim_id']}/verify", json={
        "status": "VERIFIED",
        "handover_instructions": "Collect from Security Office room 102."
    }, headers=admin_headers)
    assert verify_res.status_code == 200

    notifs_updated = client.get("/api/notifications", headers=user_headers).json()
    verified_notif = next((n for n in notifs_updated if n["type"] == "CLAIM_VERIFIED"), None)
    assert verified_notif is not None
    assert verified_notif["target_url"] == f"/claims/{claim['claim_id']}"

def test_item_status_update_endpoints(client, user_token):
    """
    Verifies that PATCH /api/{type}-items/{id} and /status both successfully update status.
    """
    headers = {"Authorization": f"Bearer {user_token}"}
    create_res = client.post("/api/lost-items", data={
        "item_name": "College ID Badge",
        "category": "College ID & Cards",
        "location_lost": "Library",
        "date_lost": "2026-09-22",
        "description": "Student ID card.",
    }, headers=headers).json()
    item_id = create_res["id"]

    # Test /status alias
    patch_alias = client.patch(f"/api/lost-items/{item_id}/status", json={"status": "RECLAIMED"}, headers=headers)
    assert patch_alias.status_code == 200
    assert patch_alias.json()["status"] == "RECLAIMED"

    # Test direct patch
    patch_direct = client.patch(f"/api/lost-items/{item_id}", json={"status": "CLOSED"}, headers=headers)
    assert patch_direct.status_code == 200
    assert patch_direct.json()["status"] == "CLOSED"
