def test_user_specific_notifications_isolation(client, user_token):
    # Register user B
    user_b_token = client.post("/api/auth/register", json={
        "name": "Student B",
        "student_staff_id": "4NI22IS055",
        "email": "2022is_student_b@nie.ac.in",
        "password": "Password@123"
    }).json()["access_token"]

    # Post item as User A and found item as User B to trigger match
    client.post("/api/lost-items", data={
        "item_name": "Unique Purple Water Bottle",
        "category": "Personal Accessories",
        "location_lost": "Auditorium",
        "date_lost": "2026-09-15",
        "description": "Milton purple stainless steel water bottle.",
        "notify_on_match": "true",
    }, headers={"Authorization": f"Bearer {user_token}"})

    client.post("/api/found-items", data={
        "item_name": "Unique Purple Water Bottle",
        "category": "Personal Accessories",
        "location_found": "Auditorium",
        "date_found": "2026-09-15",
        "description": "Purple Milton insulated bottle.",
        "custody_location": "Enquiry Counter",
        "notify_on_match": "true",
    }, headers={"Authorization": f"Bearer {user_b_token}"})

    # User A checks notifications
    notifs_a = client.get("/api/notifications", headers={"Authorization": f"Bearer {user_token}"}).json()
    assert len(notifs_a) > 0
    notif_id = notifs_a[0]["notification_id"]

    # User B cannot read or mark User A's notification as read
    unauth_read = client.patch(f"/api/notifications/{notif_id}/read", headers={"Authorization": f"Bearer {user_b_token}"})
    assert unauth_read.status_code == 404

    # User A can mark as read
    auth_read = client.patch(f"/api/notifications/{notif_id}/read", headers={"Authorization": f"Bearer {user_token}"})
    assert auth_read.status_code == 200
    assert auth_read.json()["is_read"] is True

def test_unread_count_and_read_all(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    count_res = client.get("/api/notifications/unread-count", headers=headers)
    assert count_res.status_code == 200
    assert "unread_count" in count_res.json()

    read_all_res = client.post("/api/notifications/read-all", headers=headers)
    assert read_all_res.status_code == 200

    after_count = client.get("/api/notifications/unread-count", headers=headers).json()
    assert after_count["unread_count"] == 0
