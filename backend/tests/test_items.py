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


def test_create_lost_item_json_payload(client, user_token):
    """Verifies that lost-item reporting accepts application/json payloads."""
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {
        "item_name": "Navy Blue Laptop Bag",
        "category": "Bags & Backpacks",
        "location_lost": "Campus Canteen",
        "specific_location": "First booth near counter",
        "date_lost": "2026-10-23",
        "time_lost": "Afternoon",
        "description": "Lenovo branded navy blue shoulder laptop bag.",
        "identifying_marks": "Silver NIE keychain on the zipper",
        "notify_on_match": True,
    }
    res = client.post("/api/lost-items", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["item_name"] == "Navy Blue Laptop Bag"
    assert data["category"] == "Bags & Backpacks"
    assert data["location_lost"] == "Campus Canteen"
    assert data["date_lost"] == "2026-10-23"
    assert data["status"] == "ACTIVE"
    assert "lost_item_id" in data
    assert data["lost_item_id"] == data["id"]


def test_create_lost_item_missing_item_name(client, user_token):
    """Verifies that missing item_name triggers 422 validation error."""
    headers = {"Authorization": f"Bearer {user_token}"}
    # Test JSON with missing item_name
    res_json = client.post("/api/lost-items", json={
        "category": "Bags & Backpacks",
        "location_lost": "Campus Canteen",
        "date_lost": "2026-10-23",
        "description": "Valid description with sufficient characters.",
    }, headers=headers)
    assert res_json.status_code == 422
    errors = res_json.json()["detail"]
    assert any(err["loc"][-1] == "item_name" for err in errors)

    # Test Form data with missing item_name
    res_form = client.post("/api/lost-items", data={
        "category": "Bags & Backpacks",
        "location_lost": "Campus Canteen",
        "date_lost": "2026-10-23",
        "description": "Valid description with sufficient characters.",
    }, headers=headers)
    assert res_form.status_code == 422
    errors_form = res_form.json()["detail"]
    assert any(err["loc"][-1] == "item_name" for err in errors_form)


def test_create_lost_item_missing_required_location_or_date(client, user_token):
    """Verifies that missing required location or date triggers 422 validation error."""
    headers = {"Authorization": f"Bearer {user_token}"}
    # Missing location
    res_loc = client.post("/api/lost-items", json={
        "item_name": "Calculus Notes",
        "category": "Books & Stationery",
        "date_lost": "2026-10-23",
        "description": "Spiral bound notebook with mathematics notes.",
    }, headers=headers)
    assert res_loc.status_code == 422
    assert any(err["loc"][-1] == "location_lost" for err in res_loc.json()["detail"])

    # Missing date
    res_date = client.post("/api/lost-items", json={
        "item_name": "Calculus Notes",
        "category": "Books & Stationery",
        "location_lost": "GJLT-101",
        "description": "Spiral bound notebook with mathematics notes.",
    }, headers=headers)
    assert res_date.status_code == 422
    assert any(err["loc"][-1] == "date_lost" for err in res_date.json()["detail"])


def test_create_lost_item_invalid_request_payload(client, user_token):
    """Verifies that malformed date or empty strings are rejected with 422/400."""
    headers = {"Authorization": f"Bearer {user_token}"}
    # Invalid date format
    res_invalid_date = client.post("/api/lost-items", json={
        "item_name": "Stainless Steel Bottle",
        "category": "Other Items",
        "location_lost": "Sports Complex",
        "date_lost": "not-a-date",
        "description": "Silver hydro flask bottle.",
    }, headers=headers)
    assert res_invalid_date.status_code == 422

    # Whitespace-only item_name
    res_empty_name = client.post("/api/lost-items", json={
        "item_name": "   ",
        "category": "Other Items",
        "location_lost": "Sports Complex",
        "date_lost": "2026-10-23",
        "description": "Silver hydro flask bottle.",
    }, headers=headers)
    assert res_empty_name.status_code == 422
    assert any(err["loc"][-1] == "item_name" for err in res_empty_name.json()["detail"])


def test_create_lost_item_with_image_upload(client, user_token):
    """Verifies that multipart report submission with genuine image is accepted."""
    headers = {"Authorization": f"Bearer {user_token}"}
    # Create fake 1x1 JPEG with valid magic bytes
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9"
    files = {"image": ("lost_wallet.jpg", io.BytesIO(fake_jpeg), "image/jpeg")}
    data = {
        "item_name": "Brown Leather Cardholder",
        "category": "Wallets & Purses",
        "location_lost": "Campus Library",
        "date_lost": "2026-10-22",
        "description": "Small cardholder with college bus pass inside.",
    }
    res = client.post("/api/lost-items", data=data, files=files, headers=headers)
    assert res.status_code == 201
    result = res.json()
    assert result["item_name"] == "Brown Leather Cardholder"
    assert result["image_url"] is not None
    assert result["image_url"].startswith("/uploads/")
