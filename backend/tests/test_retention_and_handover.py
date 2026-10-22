import pytest
from datetime import datetime, timezone, timedelta
from app.models.item import FoundItem, LostItem
from app.models.claim import Claim
from app.models.reclaim import ReclaimRecord
from app.services.retention_service import cleanup_expired_handover_records, get_retention_status

def test_handover_creates_reclaim_record_and_updates_status(client, db_session, test_user, test_admin, admin_token):
    # 1. Reporter creates found item
    found = FoundItem(
        user_id=test_user.user_id,
        item_name="Logitech Wireless Mouse",
        category="Electronics",
        location_found="Library 2nd Floor",
        date_found=datetime.now(timezone.utc).date(),
        status="AVAILABLE"
    )
    db_session.add(found)
    db_session.commit()
    db_session.refresh(found)

    # 2. Claimant files claim
    claim = Claim(
        found_item_id=found.found_item_id,
        claimant_user_id=test_admin.user_id,
        verification_details="Black Logitech mouse with USB dongle inside battery slot.",
        status="PENDING"
    )
    db_session.add(claim)
    db_session.commit()
    db_session.refresh(claim)

    # 3. Admin verifies claim via API
    res = client.post(
        f"/api/claims/{claim.claim_id}/verify",
        json={"status": "VERIFIED", "handover_instructions": "Collect from Central Library security desk."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "VERIFIED"

    # 4. Verify ReclaimRecord is created in database
    reclaim = db_session.query(ReclaimRecord).filter(ReclaimRecord.claim_id == claim.claim_id).first()
    assert reclaim is not None
    assert reclaim.found_id == found.found_item_id
    assert reclaim.owner_id == test_admin.user_id
    assert reclaim.status == "COMPLETED"
    assert "Central Library" in reclaim.handover_location

    # 5. Verify found item status is updated to RETURNED
    db_session.refresh(found)
    assert found.status == "RETURNED"


def test_six_month_retention_cleanup_lifecycle(db_session, test_user):
    # Create a dummy found item and claim
    found = FoundItem(
        user_id=test_user.user_id,
        item_name="Water Bottle",
        category="Other",
        location_found="Canteen",
        date_found=datetime.now(timezone.utc).date(),
        status="RETURNED"
    )
    db_session.add(found)
    db_session.commit()
    db_session.refresh(found)

    claim = Claim(
        found_item_id=found.found_item_id,
        claimant_user_id=test_user.user_id,
        verification_details="Blue Milton bottle",
        status="VERIFIED"
    )
    db_session.add(claim)
    db_session.commit()
    db_session.refresh(claim)

    now = datetime.now(timezone.utc)

    # Record 1: Fresh record (30 days old - within 180 day retention)
    fresh_rec = ReclaimRecord(
        claim_id=claim.claim_id,
        found_id=found.found_item_id,
        owner_id=test_user.user_id,
        finder_id=test_user.user_id,
        reclaim_date=now - timedelta(days=30),
        handover_location="Canteen Office",
        status="COMPLETED"
    )
    # Record 2: Expired record (210 days old - exceeds 180 day retention)
    expired_rec = ReclaimRecord(
        claim_id=claim.claim_id,
        found_id=found.found_item_id,
        owner_id=test_user.user_id,
        finder_id=test_user.user_id,
        reclaim_date=now - timedelta(days=210),
        handover_location="Canteen Office",
        status="COMPLETED"
    )
    db_session.add_all([fresh_rec, expired_rec])
    db_session.commit()
    db_session.refresh(fresh_rec)
    db_session.refresh(expired_rec)

    fresh_id = fresh_rec.reclaim_id
    expired_id = expired_rec.reclaim_id

    # Verify status report detects expired records
    status_rep = get_retention_status(db_session, retention_days=180)
    assert status_rep["expired_records_pending_cleanup"] >= 1
    assert status_rep["active_records_retained"] >= 1

    # Run cleanup
    clean_res = cleanup_expired_handover_records(db_session, retention_days=180)
    assert clean_res["status"] == "SUCCESS"
    assert clean_res["cleaned_count"] >= 1

    # Fresh record remains; expired record is purged
    assert db_session.query(ReclaimRecord).filter(ReclaimRecord.reclaim_id == fresh_id).first() is not None
    assert db_session.query(ReclaimRecord).filter(ReclaimRecord.reclaim_id == expired_id).first() is None

    # Idempotent re-run: safe and cleans 0
    repeat_res = cleanup_expired_handover_records(db_session, retention_days=180)
    assert repeat_res["status"] == "SUCCESS"
    assert repeat_res["cleaned_count"] == 0

    # Ensure parent item and claim remain completely intact
    assert db_session.query(FoundItem).filter(FoundItem.found_id == found.found_id).first() is not None
    assert db_session.query(Claim).filter(Claim.claim_id == claim.claim_id).first() is not None
