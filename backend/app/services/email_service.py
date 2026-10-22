import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_USE_TLS,
    PASSWORD_RESET_EXPIRE_MINUTES,
    FRONTEND_URL,
)

logger = logging.getLogger("smart_campus.email")

def is_smtp_configured() -> bool:
    """Returns True only if an SMTP server hostname has been configured."""
    return bool(SMTP_HOST and SMTP_HOST.strip())

def send_password_reset_email(to_email: str, recipient_name: str, reset_link: str) -> None:
    """
    Sends a secure password reset email with a temporary link.
    Never logs the reset link or token.
    """
    if not is_smtp_configured():
        raise RuntimeError(
            "SMTP is not configured on this server. Please configure SMTP_HOST, "
            "SMTP_PORT, SMTP_USERNAME, and SMTP_PASSWORD in backend/.env."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Password Reset Request — NIE Smart Campus Lost & Found"
    msg["From"] = f"NIE Smart Campus Lost & Found <{SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    plain_text = f"""Dear {recipient_name},

We received a request to reset your password for the NIE Smart Campus Lost & Found System.

To set a new password for your account, please copy and paste the following secure link into your web browser:
{reset_link}

This link is valid for {PASSWORD_RESET_EXPIRE_MINUTES} minutes and can only be used once.

If you did not request a password reset, please disregard this email. Your current password remains secure and unchanged.

Regards,
Smart Campus Lost & Found System
The National Institute of Engineering (NIE), Mysuru
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background-color: #0f172a; color: #ffffff; padding: 24px 32px; text-align: center; }}
    .header h1 {{ margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }}
    .header p {{ margin: 0; font-size: 13px; color: #94a3b8; }}
    .content {{ padding: 32px; line-height: 1.6; font-size: 15px; color: #334155; }}
    .button-container {{ text-align: center; margin: 32px 0; }}
    .button {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }}
    .note {{ background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 24px 0; font-size: 13px; color: #475569; border-radius: 0 6px 6px 0; }}
    .footer {{ padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Smart Campus Lost &amp; Found</h1>
      <p>The National Institute of Engineering (NIE), Mysuru</p>
    </div>
    <div class="content">
      <p>Hello <strong>{recipient_name}</strong>,</p>
      <p>We received a request to reset your password for your registered NIE institutional account.</p>
      <div class="button-container">
        <a href="{reset_link}" class="button" target="_blank" rel="noopener noreferrer">Reset Your Password</a>
      </div>
      <div class="note">
        <strong>Security Notice:</strong> This link is single-use and will expire in <strong>{PASSWORD_RESET_EXPIRE_MINUTES} minutes</strong>. If you did not request this reset, your account is safe and no action is required.
      </div>
      <p style="font-size: 13px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:<br><span style="word-break: break-all; color: #2563eb;">{reset_link}</span></p>
    </div>
    <div class="footer">
      This is an automated system notification from the NIE Smart Campus Lost &amp; Found System.<br>
      Manandavadi Road, Mysuru, Karnataka 570008
    </div>
  </div>
</body>
</html>
"""

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Password reset email dispatched successfully to registered user")
    except Exception as e:
        logger.error(f"Failed to dispatch password reset email: {type(e).__name__}")
        raise RuntimeError("Unable to deliver password reset email. Please contact campus IT administration.") from e


def _send_system_email(to_email: str, subject: str, plain_text: str, html_content: str) -> dict:
    """Internal helper to dispatch system emails with honest dispatch status reporting."""
    if not is_smtp_configured():
        logger.info(f"Email delivery skipped for {to_email}: SMTP server not configured in backend/.env.")
        return {"status": "NOT_CONFIGURED", "message": "SMTP host is not configured."}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{subject} — NIE Smart Campus Lost & Found"
    msg["From"] = f"NIE Smart Campus Lost & Found <{SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email '{subject}' successfully delivered to {to_email}")
        return {"status": "ACCEPTED", "message": "Email accepted by SMTP relay."}
    except Exception as e:
        logger.error(f"Failed to deliver email '{subject}' to {to_email}: {e}")
        return {"status": "FAILED", "message": str(e)}


def send_report_confirmation_email(
    to_email: str,
    recipient_name: str,
    report_type: str,
    report_id: int,
    item_title: str,
    status: str
) -> dict:
    """Dispatches report confirmation email upon successful submission."""
    report_label = "Lost Item Report" if report_type.lower() == "lost" else "Found Item Report"
    item_url = f"{FRONTEND_URL}/items/{report_type.lower()}/{report_id}"
    subject = f"Report Confirmation: #{report_id} {item_title}"

    plain_text = f"""Dear {recipient_name},

Your {report_label} has been successfully registered in the NIE Smart Campus Lost & Found System.

Report Details:
- Report ID: #{report_id}
- Item: {item_title}
- Status: {status}
- View Report: {item_url}

The system is continuously comparing your report against campus records. You will receive an alert as soon as a potential match is identified.

Regards,
Smart Campus Lost & Found System
The National Institute of Engineering (NIE), Mysuru
"""

    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px;">
    <h2 style="color: #0f172a; margin-top: 0;">Smart Campus Lost &amp; Found</h2>
    <p>Dear <strong>{recipient_name}</strong>,</p>
    <p>Your <strong>{report_label}</strong> has been registered successfully.</p>
    <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Report ID:</strong> #{report_id}</p>
      <p style="margin: 4px 0;"><strong>Item:</strong> {item_title}</p>
      <p style="margin: 4px 0;"><strong>Status:</strong> {status}</p>
    </div>
    <p><a href="{item_url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">View Your Report</a></p>
    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">The system will automatically notify you when compatible items are reported on campus.</p>
  </div>
</body>
</html>"""

    return _send_system_email(to_email, subject, plain_text, html_content)


def send_match_alert_email(
    to_email: str,
    recipient_name: str,
    lost_item_name: str,
    found_item_name: str,
    match_score: int,
    confidence: str,
    target_url: str
) -> dict:
    """Dispatches a match alert email when a candidate meets the confidence threshold."""
    subject = f"Potential Match Alert ({match_score}%): {lost_item_name}"
    full_url = f"{FRONTEND_URL}{target_url}" if not target_url.startswith("http") else target_url

    plain_text = f"""Dear {recipient_name},

A potential match has been identified for your lost item '{lost_item_name}'.

Match Details:
- Found Item: {found_item_name}
- Similarity Score: {match_score}% ({confidence} Confidence)
- Review Match: {full_url}

Please log in to your NIE Lost & Found portal to review the details and initiate a verification claim if this is your item.

Regards,
Smart Campus Lost & Found System
The National Institute of Engineering (NIE), Mysuru
"""

    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px;">
    <h2 style="color: #0f172a; margin-top: 0;">Potential Match Identified</h2>
    <p>Dear <strong>{recipient_name}</strong>,</p>
    <p>Our automated matching engine found a potential match for your lost item <strong>{lost_item_name}</strong>.</p>
    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Found Item:</strong> {found_item_name}</p>
      <p style="margin: 4px 0;"><strong>Match Confidence:</strong> {confidence} ({match_score}%)</p>
    </div>
    <p><a href="{full_url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">Inspect Potential Match</a></p>
    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">Note: Matching scores are probabilistic indicators and do not constitute proof of ownership. Official verification is required before handover.</p>
  </div>
</body>
</html>"""

    return _send_system_email(to_email, subject, plain_text, html_content)


def send_claim_alert_email(
    to_email: str,
    recipient_name: str,
    item_title: str,
    claim_id: int,
    status: str,
    notes: str
) -> dict:
    """Dispatches an email alert regarding an ownership claim status update."""
    subject = f"Ownership Claim Update: #{claim_id} ({status})"
    claim_url = f"{FRONTEND_URL}/claims/{claim_id}"

    plain_text = f"""Dear {recipient_name},

There is an update regarding the ownership claim for '{item_title}'.

Status: {status}
Notes: {notes}
Review Claim: {claim_url}

Regards,
Smart Campus Lost & Found System
The National Institute of Engineering (NIE), Mysuru
"""

    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px;">
    <h2 style="color: #0f172a; margin-top: 0;">Ownership Claim Update</h2>
    <p>Dear <strong>{recipient_name}</strong>,</p>
    <p>The status of your claim for <strong>{item_title}</strong> has been updated to <strong>{status}</strong>.</p>
    <p style="background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">{notes}</p>
    <p><a href="{claim_url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">View Claim Details</a></p>
  </div>
</body>
</html>"""

    return _send_system_email(to_email, subject, plain_text, html_content)


def send_handover_complete_email(
    to_email: str,
    recipient_name: str,
    item_title: str,
    handover_location: str
) -> dict:
    """Dispatches a confirmation email upon successful verified handover of an item."""
    subject = f"Handover Completed: {item_title}"

    plain_text = f"""Dear {recipient_name},

The verified return of '{item_title}' has been successfully completed and recorded in the campus registry.

Handover Location: {handover_location or 'Campus Lost & Found Office'}

Thank you for participating in the NIE Smart Campus Lost & Found initiative.

Regards,
Smart Campus Lost & Found System
The National Institute of Engineering (NIE), Mysuru
"""

    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px;">
    <h2 style="color: #16a34a; margin-top: 0;">Handover Completed</h2>
    <p>Dear <strong>{recipient_name}</strong>,</p>
    <p>The return of <strong>{item_title}</strong> has been verified and completed successfully.</p>
    <p><strong>Location:</strong> {handover_location or 'Campus Lost &amp; Found Desk'}</p>
    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">This handover has been archived in the official six-month audit history.</p>
  </div>
</body>
</html>"""

    return _send_system_email(to_email, subject, plain_text, html_content)

