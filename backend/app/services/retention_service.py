import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.reclaim import ReclaimRecord
from app.models.claim import Claim
from app.models.item import LostItem, FoundItem

logger = logging.getLogger("smart_campus.retention")

# Configurable retention period in days (defaults to 180 days / 6 months)
DEFAULT_RETENTION_DAYS: int = int(os.getenv("HANDOVER_RETENTION_DAYS", "180"))

def cleanup_expired_handover_records(
    db: Session,
    retention_days: int = DEFAULT_RETENTION_DAYS,
    anonymize: bool = False
) -> Dict[str, Any]:
    """
    Executes idempotent cleanup of completed handover history exceeding the retention period.
    
    Adheres to Section 10 & 11:
    - Retains records within the 6-month window (retention_days).
    - Identifies expired records based on reclaim_date.
    - Anonymizes or safely removes expired records without cascading destructive deletes
      to active user accounts, open reports, or active claims.
    - Idempotent and safe to run repeatedly.
    - Logs summary without exposing sensitive user personal data.
    """
    now = datetime.now(timezone.utc)
    cutoff_date = now - timedelta(days=retention_days)

    logger.info(
        f"[Retention] Initiating handover history cleanup (Cutoff: {cutoff_date.isoformat()}, "
        f"Retention: {retention_days} days, Anonymize: {anonymize})"
    )

    try:
        # Query expired records
        expired_query = db.query(ReclaimRecord).filter(
            ReclaimRecord.reclaim_date <= cutoff_date
        )
        expired_count = expired_query.count()

        if expired_count == 0:
            logger.info("[Retention] No expired handover records found.")
            return {
                "status": "SUCCESS",
                "expired_found": 0,
                "cleaned_count": 0,
                "retention_days": retention_days,
                "cutoff_date": cutoff_date.isoformat(),
                "execution_time": now.isoformat(),
            }

        cleaned_count = 0
        if anonymize:
            # Anonymize remarks and location, keeping the statistical audit row
            for record in expired_query.all():
                record.remarks = "[Archived / Retention Expired]"
                record.handover_location = "Campus Registry (Archived)"
                cleaned_count += 1
            db.commit()
            logger.info(f"[Retention] Anonymized {cleaned_count} expired handover records.")
        else:
            # Safe deletion: delete only the reclaim records, leaving items and users intact
            cleaned_count = expired_query.delete(synchronize_session=False)
            db.commit()
            logger.info(f"[Retention] Purged {cleaned_count} expired handover records.")

        return {
            "status": "SUCCESS",
            "expired_found": expired_count,
            "cleaned_count": cleaned_count,
            "mode": "anonymize" if anonymize else "purge",
            "retention_days": retention_days,
            "cutoff_date": cutoff_date.isoformat(),
            "execution_time": now.isoformat(),
        }

    except Exception as e:
        db.rollback()
        logger.error(f"[Retention] Cleanup failed: {e}")
        return {
            "status": "FAILED",
            "error": str(e),
            "retention_days": retention_days,
            "cutoff_date": cutoff_date.isoformat(),
            "execution_time": now.isoformat(),
        }


def get_retention_status(db: Session, retention_days: int = DEFAULT_RETENTION_DAYS) -> Dict[str, Any]:
    """Retrieves current retention status and audit counts for administrators."""
    now = datetime.now(timezone.utc)
    cutoff_date = now - timedelta(days=retention_days)

    total_records = db.query(ReclaimRecord).count()
    active_retained = db.query(ReclaimRecord).filter(ReclaimRecord.reclaim_date > cutoff_date).count()
    expired_pending = db.query(ReclaimRecord).filter(ReclaimRecord.reclaim_date <= cutoff_date).count()

    return {
        "retention_policy": f"{retention_days} days (approx. {retention_days // 30} months)",
        "total_handover_records": total_records,
        "active_records_retained": active_retained,
        "expired_records_pending_cleanup": expired_pending,
        "cutoff_threshold": cutoff_date.isoformat(),
        "checked_at": now.isoformat()
    }
