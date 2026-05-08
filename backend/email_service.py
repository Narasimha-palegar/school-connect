"""Resend email service — async, non-blocking, fail-safe (logs but doesn't raise)."""
import os
import asyncio
import base64
import logging
import resend

logger = logging.getLogger("school_connect.email")


def _is_configured() -> bool:
    return bool(os.environ.get("RESEND_API_KEY"))


def _sandbox_to(recipient: str) -> str:
    """Resend sandbox sender (onboarding@resend.dev) can only deliver to the
    Resend account owner's email. Redirect everything to the owner during testing
    so the integration is verifiable end-to-end without DNS setup."""
    sender = os.environ.get("SENDER_EMAIL", "")
    owner = os.environ.get("RESEND_OWNER_EMAIL")
    if owner and "onboarding@resend.dev" in sender:
        return owner
    return recipient


async def send_email(
    to: str,
    subject: str,
    html: str,
    attachments: list | None = None,
) -> dict | None:
    """Send an email via Resend. Returns provider response dict on success, None on failure."""
    if not _is_configured():
        logger.warning("RESEND_API_KEY not set — skipping email to %s", to)
        return None
    resend.api_key = os.environ["RESEND_API_KEY"]
    actual_to = _sandbox_to(to)
    params = {
        "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
        "to": [actual_to],
        "subject": subject,
        "html": html,
    }
    if attachments:
        params["attachments"] = attachments
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Email sent (id=%s) to=%s (intended=%s) subject=%s", result.get("id"), actual_to, to, subject)
        return result
    except Exception as e:  # noqa: BLE001
        logger.exception("Resend send failed for %s: %s", to, e)
        return None


# ---------- Templates ----------

_BASE = "font-family:'Helvetica Neue',Arial,sans-serif;background:#F7F6F3;color:#141412;max-width:560px;margin:0 auto;padding:32px;"


def _wrap(content_html: str) -> str:
    return f"""
    <div style="background:#F7F6F3;padding:32px 0;">
      <div style="{_BASE} background:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);">
        <div style="font-family:'Chivo',Arial,sans-serif;font-weight:900;font-size:22px;letter-spacing:-0.02em;color:#DF5C3D;margin-bottom:24px;">
          School Connect
        </div>
        {content_html}
        <hr style="border:none;border-top:1px solid #E5E4E0;margin:32px 0 16px;" />
        <div style="font-size:12px;color:#8a8a85;">
          You're receiving this because of activity on your School Connect account. If this wasn't you, please contact your school administrator.
        </div>
      </div>
    </div>
    """


def _otp_card(otp: str) -> str:
    return f"""<div style="font-family:monospace;font-size:32px;letter-spacing:8px;font-weight:700;background:#F2C55C33;padding:18px 24px;border-radius:12px;text-align:center;color:#141412;">{otp}</div>"""


def login_otp_html(name: str, otp: str, role: str) -> str:
    name_part = name or "there"
    role_part = f" ({role.capitalize()})" if role else ""
    return _wrap(f"""
      <h1 style="font-family:'Chivo',Arial,sans-serif;font-weight:900;font-size:28px;letter-spacing:-0.02em;margin:0 0 12px;">Sign in to School Connect</h1>
      <p style="color:#575652;line-height:1.6;margin:0 0 20px;">
        Hi {name_part}{role_part}, use the 6-digit code below to sign in. The code expires in 10 minutes.
      </p>
      {_otp_card(otp)}
      <p style="color:#575652;line-height:1.6;margin:20px 0 0;">If you didn't try to sign in, you can safely ignore this email.</p>
    """)


def lost_found_status_html(
    reporter_name: str, item_name: str, description: str, location: str,
    status: str, resolver_name: str, resolver_email: str, has_image: bool,
) -> str:
    headline = "Great news — your item has been found!" if status == "claimed" else "Your Lost & Found report is resolved"
    body = (
        f"It looks like <strong>{item_name}</strong> may have been recovered. "
        "Please visit the school's Front Office to identify and collect it."
    ) if status == "claimed" else (
        f"Your report for <strong>{item_name}</strong> has been marked resolved. "
        "If this is incorrect, please contact the school office."
    )
    image_block = (
        '<div style="margin:8px 0 24px;">'
        '<div style="font-size:12px;color:#8a8a85;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Photo</div>'
        '<img src="cid:lostfound-image" alt="Item" style="width:100%;max-width:480px;border-radius:12px;border:1px solid #E5E4E0;" />'
        '</div>'
    ) if has_image else ""
    return _wrap(f"""
      <h1 style="font-family:'Chivo',Arial,sans-serif;font-weight:900;font-size:26px;letter-spacing:-0.02em;margin:0 0 12px;">{headline}</h1>
      <p style="color:#575652;line-height:1.6;margin:0 0 16px;">Hi {reporter_name}, {body}</p>
      {image_block}
      <table style="width:100%;border-collapse:collapse;background:#F7F6F3;border-radius:12px;overflow:hidden;margin:16px 0;">
        <tr><td style="padding:12px 16px;color:#8a8a85;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;width:160px;">Item</td><td style="padding:12px 16px;font-weight:600;">{item_name}</td></tr>
        <tr><td style="padding:12px 16px;color:#8a8a85;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Description</td><td style="padding:12px 16px;">{description}</td></tr>
        <tr><td style="padding:12px 16px;color:#8a8a85;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Last seen at</td><td style="padding:12px 16px;">{location}</td></tr>
        <tr><td style="padding:12px 16px;color:#8a8a85;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Pickup location</td><td style="padding:12px 16px;"><strong>School Front Office</strong></td></tr>
        <tr><td style="padding:12px 16px;color:#8a8a85;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Status</td><td style="padding:12px 16px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#E8F5E9;color:#2E7D32;font-size:12px;font-weight:600;text-transform:uppercase;">{status}</span></td></tr>
        <tr><td style="padding:12px 16px;color:#8a8a85;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Resolved by</td><td style="padding:12px 16px;">{resolver_name}<br/><a href="mailto:{resolver_email}" style="color:#DF5C3D;text-decoration:none;">{resolver_email}</a></td></tr>
      </table>
      <p style="color:#575652;line-height:1.6;margin:0;">Please reply directly to the resolver above if you need to coordinate pickup.</p>
    """)


# Convenience wrappers
async def send_login_otp(email: str, name: str, otp: str, role: str = ""):
    return await send_email(email, "Your School Connect sign-in code", login_otp_html(name, otp, role))


async def send_lost_found_notification(
    email: str, reporter_name: str, item_name: str, description: str, location: str,
    status: str, resolver_name: str, resolver_email: str, image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
):
    has_image = bool(image_bytes)
    html = lost_found_status_html(
        reporter_name=reporter_name, item_name=item_name, description=description,
        location=location, status=status, resolver_name=resolver_name,
        resolver_email=resolver_email, has_image=has_image,
    )
    attachments = None
    if has_image:
        ext = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif"}.get(image_mime, "jpg")
        attachments = [{
            "filename": f"item.{ext}",
            "content": base64.b64encode(image_bytes).decode("ascii"),
            "content_id": "lostfound-image",
            "content_type": image_mime,
        }]
    subject = "Your lost item has been found" if status == "claimed" else "Your Lost & Found report has been resolved"
    return await send_email(email, subject, html, attachments=attachments)
