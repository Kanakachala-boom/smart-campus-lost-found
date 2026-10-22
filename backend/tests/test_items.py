import io

def test_create_lost_item(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    data = {
        "item_name": "Black Wildhorn Wallet",
        "category": "Wallets & Purses",
        "location_lost": "Campus Canteen",
        "specific_location": "Seating corner",
        "date_lost": "2026-09-12",
        "time_lost": "Afternoon",
        "description": "Black leather wallet with student IDs inside.",
        "identifying_marks": "Secret card ending in 8921",
        "notify_on_match": "true",
    }
    response = client.post("/api/lost-items", data=data, headers=headers)
    assert response.status_code == 201
    res = response.json()
    assert res["item_name"] == "Black Wildhorn Wallet"
    assert res["status"] == "ACTIVE"
    # Creator CAN see private identifying marks
    assert res["identifying_marks"] == "Secret card ending in 8921"

def test_create_found_item(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    data = {
        "item_name": "HP Scientific Calculator",
        "category": "Electronics & Gadgets",
        "location_found": "Central Library",
        "date_found": "2026-09-13",
        "description": "Black scientific calculator found on table 4.",
        "custody_location": "Library Desk",
        "contact_preference": "Coordinate Handover via Campus Security / Admin",
        "notify_on_match": "true",
    }
    response = client.post("/api/found-items", data=data, headers=headers)
    assert response.status_code == 201
    res = response.json()
    assert res["item_name"] == "HP Scientific Calculator"
    assert res["status"] == "AVAILABLE"

def test_list_items(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    # Create an item first
    client.post("/api/lost-items", data={
        "item_name": "Keys on Metal Ring",
        "category": "Keys",
        "location_lost": "Campus Parking Area",
        "date_lost": "2026-09-14",
        "description": "Bike key with blue keychain.",
    }, headers=headers)

    response = client.get("/api/items?type=all&page=1&limit=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) >= 1

def test_public_identifying_marks_shielded(client, test_user, test_admin, user_token, admin_token):
    headers_creator = {"Authorization": f"Bearer {user_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    create_res = client.post("/api/lost-items", data={
        "item_name": "Titan Wristwatch",
        "category": "Personal Accessories",
        "location_lost": "Sports Complex",
        "date_lost": "2026-09-15",
        "description": "Silver analog watch with stainless steel strap.",
        "identifying_marks": "Serial #TT-9842 engraved on back plate.",
    }, headers=headers_creator)
    item_id = create_res.json()["id"]

    # Public user (no auth or unrelated student)
    pub_res = client.get(f"/api/lost-items/{item_id}")
    assert pub_res.status_code == 200
    assert pub_res.json()["identifying_marks"] is None

    # Admin CAN see identifying marks
    adm_res = client.get(f"/api/lost-items/{item_id}", headers=headers_admin)
    assert adm_res.status_code == 200
    assert adm_res.json()["identifying_marks"] == "Serial #TT-9842 engraved on back plate."

def test_item_ownership_permissions(client, user_token, admin_token, test_user):
    headers_user = {"Authorization": f"Bearer {user_token}"}

    create_res = client.post("/api/lost-items", data={
        "item_name": "Water Bottle",
        "category": "Personal Accessories",
        "location_lost": "Canteen",
        "date_lost": "2026-09-15",
        "description": "Blue bottle.",
    }, headers=headers_user)
    item_id = create_res.json()["id"]

    # Another user tries to update item
    other_token = client.post("/api/auth/register", json={
        "name": "Another Student",
        "student_staff_id": "4NI22IS088",
        "email": "2022is_another@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]
    headers_other = {"Authorization": f"Bearer {other_token}"}

    update_res = client.patch(f"/api/lost-items/{item_id}", json={"status": "CLOSED"}, headers=headers_other)
    assert update_res.status_code == 403


def test_edit_item_reports(client, user_token):
    headers_user = {"Authorization": f"Bearer {user_token}"}

    # 1. Create a lost item
    create_res = client.post("/api/lost-items", data={
        "item_name": "Calculus Textbook",
        "category": "Books & Stationery",
        "location_lost": "Library 1st Floor",
        "date_lost": "2026-09-15",
        "description": "Thomas Calculus 14th edition.",
    }, headers=headers_user)
    assert create_res.status_code == 201
    lost_id = create_res.json()["id"]

    # 2. Owner edits report details
    edit_res = client.put(f"/api/lost-items/{lost_id}", json={
        "item_name": "Thomas Calculus 14th Edition Textbook",
        "description": "Hardcover copy with name written on inside cover.",
        "location": "Library 2nd Floor Reading Hall",
        "category": "Books & Stationery",
        "date": "2026-09-15",
    }, headers=headers_user)
    assert edit_res.status_code == 200
    updated_data = edit_res.json()
    assert updated_data["item_name"] == "Thomas Calculus 14th Edition Textbook"
    assert updated_data["location"] == "Library 2nd Floor Reading Hall"

    # 3. Unauthorized user cannot edit someone else's report
    other_token = client.post("/api/auth/register", json={
        "name": "Intruder Student",
        "student_staff_id": "4NI22IS099",
        "email": "2022is_intruder@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]
    headers_other = {"Authorization": f"Bearer {other_token}"}

    unauth_edit = client.put(f"/api/lost-items/{lost_id}", json={
        "item_name": "Hacked Title",
    }, headers=headers_other)
    assert unauth_edit.status_code == 403

