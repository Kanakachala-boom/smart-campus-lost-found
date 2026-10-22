import pytest
from app.services.sms_service import send_sms_notification, is_sms_configured
from app.services.email_service import (
    is_smtp_configured,
    send_report_confirmation_email,
    send_match_alert_email,
    send_claim_alert_email,
    send_handover_complete_email,
)

def test_sms_service_honest_unconfigured_reporting():
    # When credentials are not configured, send_sms_notification must return NOT_CONFIGURED
    res = send_sms_notification("+919876543210", "Test notification message")
    if not is_sms_configured():
        assert res["status"] == "NOT_CONFIGURED"
        assert "SMS gateway is currently disabled or unconfigured" in res["message"]


def test_sms_service_handles_missing_phone():
    res = send_sms_notification(None, "Test message")
    assert res["status"] == "SKIPPED"
    assert res["reason"] == "NO_PHONE_NUMBER"


def test_email_service_honest_unconfigured_reporting():
    # In test environment where SMTP is unconfigured, system email functions report NOT_CONFIGURED
    if not is_smtp_configured():
        res1 = send_report_confirmation_email("test@nie.ac.in", "Student", "lost", 101, "Scientific Calculator", "ACTIVE")
        assert res1["status"] == "NOT_CONFIGURED"

        res2 = send_match_alert_email("test@nie.ac.in", "Student", "Calculator", "Casio fx-991EX", 92, "High", "/items/found/5")
        assert res2["status"] == "NOT_CONFIGURED"

        res3 = send_claim_alert_email("test@nie.ac.in", "Student", "Calculator", 1, "VERIFIED", "Collect at security")
        assert res3["status"] == "NOT_CONFIGURED"

        res4 = send_handover_complete_email("test@nie.ac.in", "Student", "Calculator", "Central Security Desk")
        assert res4["status"] == "NOT_CONFIGURED"
