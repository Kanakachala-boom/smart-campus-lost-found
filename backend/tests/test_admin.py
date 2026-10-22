def test_admin_dashboard_metrics(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/admin/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    metrics = data["metrics"]
    assert "totalLost" in metrics
    assert "totalFound" in metrics
    assert "recoveryRate" in metrics

def test_admin_endpoints_block_standard_users(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    dash_res = client.get("/api/admin/dashboard", headers=headers)
    assert dash_res.status_code == 403

    claims_res = client.get("/api/admin/claims", headers=headers)
    assert claims_res.status_code == 403

    items_res = client.get("/api/admin/items", headers=headers)
    assert items_res.status_code == 403

    matches_res = client.get("/api/admin/matches", headers=headers)
    assert matches_res.status_code == 403
