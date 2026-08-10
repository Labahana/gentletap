"""Compact invoice-card HTML + plain-text wrappers for reminder emails."""

from __future__ import annotations

import html
import re
from dataclasses import dataclass

_PAY_LINK_RE = re.compile(r"\n*\s*Pay online:\s*https?://\S+", re.IGNORECASE)
_CLOSING_RE = re.compile(
    r"\n+(?:best(?:\s+regards)?|thanks(?:\s+so\s+much)?|regards|cheers|sincerely|warmly)[^\n]*\n+[^\n]+\s*$",
    re.IGNORECASE,
)

_CURRENCY_SYMBOLS = {
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "NGN": "₦",
    "CAD": "CA$",
    "AUD": "A$",
}


@dataclass(frozen=True)
class ReminderEmailData:
    doc_number: str
    balance: float
    currency: str
    client_name: str
    business_name: str
    contact_email: str | None = None
    contact_phone: str | None = None
    payment_link: str | None = None


def format_currency(balance: float, currency: str) -> str:
    code = (currency or "USD").upper()
    symbol = _CURRENCY_SYMBOLS.get(code)
    formatted = f"{balance:,.2f}"
    if symbol:
        return f"{symbol}{formatted}"
    return f"{code} {formatted}"


def clean_message_body(body: str, *, business_name: str) -> str:
    """Remove duplicate payment links and trailing sign-offs before wrapping."""
    text = (body or "").strip()
    text = _PAY_LINK_RE.sub("", text).strip()
    text = _CLOSING_RE.sub("", text).strip()
    # Drop a trailing line that only repeats the business / sender name.
    if business_name:
        lines = text.splitlines()
        while lines and lines[-1].strip().lower() == business_name.strip().lower():
            lines.pop()
        text = "\n".join(lines).strip()
    return text


def _header_label(doc_number: str) -> str:
    doc = doc_number.strip() or "invoice"
    return f"Invoice #{doc} · Balance due"


def _contact_footer_lines(data: ReminderEmailData) -> list[str]:
    parts: list[str] = []
    if data.contact_email:
        parts.append(data.contact_email)
    if data.contact_phone:
        parts.append(data.contact_phone)
    return parts


def render_reminder_plain(data: ReminderEmailData, message_body: str) -> str:
    amount = format_currency(data.balance, data.currency)
    cleaned = clean_message_body(message_body, business_name=data.business_name)
    lines = [
        _header_label(data.doc_number),
        amount,
        "",
        cleaned,
    ]
    if data.payment_link:
        lines.extend(["", f"View invoice: {data.payment_link}"])
    footer_bits = _contact_footer_lines(data)
    if footer_bits:
        lines.extend(["", "—", data.business_name, " · ".join(footer_bits)])
    elif data.business_name:
        lines.extend(["", "—", data.business_name])
    return "\n".join(lines).strip() + "\n"


def render_reminder_html(data: ReminderEmailData, message_body: str) -> str:
    amount = format_currency(data.balance, data.currency)
    cleaned = clean_message_body(message_body, business_name=data.business_name)
    message_html = html.escape(cleaned).replace("\n", "<br>\n")

    cta_row = ""
    if data.payment_link:
        link = html.escape(data.payment_link, quote=True)
        cta_row = f"""
          <tr>
            <td align="center" style="padding:0 16px 14px;">
              <a href="{link}" style="display:inline-block;background:#2e7d32;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 22px;border-radius:999px;">View invoice</a>
            </td>
          </tr>"""

    footer_bits = _contact_footer_lines(data)
    footer_contact = html.escape(" · ".join(footer_bits)) if footer_bits else ""
    business = html.escape(data.business_name)

    footer_html = f'<div style="font-weight:600;color:#4a4540;">{business}</div>'
    if footer_contact:
        footer_html += f'<div style="margin-top:4px;">{footer_contact}</div>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(_header_label(data.doc_number))}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f3;">
    <tr>
      <td align="center" style="padding:16px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e8e2da;">
          <tr>
            <td style="background:#eef7ee;padding:12px 16px;border-bottom:1px solid #dceee0;">
              <p style="margin:0;font-size:13px;line-height:1.3;color:#4a5d4a;font-weight:600;">{html.escape(_header_label(data.doc_number))}</p>
              <p style="margin:4px 0 0;font-size:22px;line-height:1.2;font-weight:700;color:#1a1a1a;">{html.escape(amount)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px;font-size:14px;line-height:1.5;color:#2c2825;">
              {message_html}
            </td>
          </tr>{cta_row}
          <tr>
            <td style="padding:12px 16px;background:#faf8f5;border-top:1px solid #e8e2da;font-size:11px;line-height:1.5;color:#6b6560;text-align:center;">
              {footer_html}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def build_reminder_bodies(
    data: ReminderEmailData,
    message_body: str,
) -> tuple[str, str]:
    """Return (plain_text, html) for multipart reminder delivery."""
    return render_reminder_plain(data, message_body), render_reminder_html(data, message_body)


@dataclass(frozen=True)
class AuthEmailData:
    greeting: str
    message: str
    cta_label: str
    cta_url: str
    footer_note: str = "GentleTap · Payment collection on autopilot"


def _render_card_html(
    *,
    page_title: str,
    header_label: str,
    header_value: str | None,
    header_bg: str,
    header_border: str,
    header_label_color: str,
    body_html: str,
    cta_label: str | None = None,
    cta_url: str | None = None,
    footer_html: str | None = None,
) -> str:
    header_value_html = ""
    if header_value:
        header_value_html = (
            f'<p style="margin:4px 0 0;font-size:22px;line-height:1.2;font-weight:700;color:#1a1a1a;">'
            f"{html.escape(header_value)}</p>"
        )

    cta_row = ""
    if cta_label and cta_url:
        cta_row = f"""
          <tr>
            <td align="center" style="padding:0 16px 14px;">
              <a href="{html.escape(cta_url, quote=True)}" style="display:inline-block;background:#e07a5f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 22px;border-radius:999px;">{html.escape(cta_label)}</a>
            </td>
          </tr>"""

    footer_row = ""
    if footer_html:
        footer_row = f"""
          <tr>
            <td style="padding:12px 16px;background:#faf8f5;border-top:1px solid #e8e2da;font-size:11px;line-height:1.5;color:#6b6560;text-align:center;">
              {footer_html}
            </td>
          </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(page_title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f3;">
    <tr>
      <td align="center" style="padding:16px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e8e2da;">
          <tr>
            <td style="background:{header_bg};padding:12px 16px;border-bottom:1px solid {header_border};">
              <p style="margin:0;font-size:13px;line-height:1.3;color:{header_label_color};font-weight:600;">{html.escape(header_label)}</p>
              {header_value_html}
            </td>
          </tr>
          <tr>
            <td style="padding:16px;font-size:14px;line-height:1.5;color:#2c2825;">
              {body_html}
            </td>
          </tr>{cta_row}{footer_row}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def render_password_reset_bodies(data: AuthEmailData) -> tuple[str, str]:
    body_plain = "\n".join(
        [
            data.greeting,
            "",
            data.message,
            "",
            f"{data.cta_label}: {data.cta_url}",
            "",
            "If you didn't request this, you can ignore this email.",
            "",
            f"— {data.footer_note}",
        ]
    ).strip() + "\n"

    message_html = html.escape(data.message).replace("\n", "<br>\n")
    body_html = (
        f"<p style=\"margin:0 0 12px;\">{html.escape(data.greeting)}</p>"
        f"<p style=\"margin:0;\">{message_html}</p>"
        f"<p style=\"margin:12px 0 0;font-size:12px;color:#6b6560;\">"
        f"If you didn't request this, you can ignore this email.</p>"
    )
    footer_html = html.escape(data.footer_note)
    html_doc = _render_card_html(
        page_title="Reset your GentleTap password",
        header_label="Password reset",
        header_value=None,
        header_bg="#faf6f0",
        header_border="#e8e2da",
        header_label_color="#4a4540",
        body_html=body_html,
        cta_label=data.cta_label,
        cta_url=data.cta_url,
        footer_html=footer_html,
    )
    return body_plain, html_doc


@dataclass(frozen=True)
class PaymentReceivedEmailData:
    doc_number: str
    amount: float
    currency: str
    client_name: str
    dashboard_url: str


def render_payment_received_bodies(data: PaymentReceivedEmailData) -> tuple[str, str]:
    amount = format_currency(data.amount, data.currency)
    doc = data.doc_number.strip() or "invoice"
    summary = f"{data.client_name} paid invoice #{doc}."
    plain = "\n".join(
        [
            "Payment received",
            amount,
            "",
            summary,
            "Reminders for this invoice have stopped.",
            "",
            f"View in GentleTap: {data.dashboard_url}",
            "",
            "— GentleTap · Synced from QuickBooks",
        ]
    ).strip() + "\n"

    body_html = (
        f"<p style=\"margin:0 0 8px;\">{html.escape(summary)}</p>"
        f"<p style=\"margin:0;font-size:13px;color:#6b6560;\">"
        f"Reminders for this invoice have stopped.</p>"
    )
    html_doc = _render_card_html(
        page_title="Payment received",
        header_label="Payment received",
        header_value=amount,
        header_bg="#eef7ee",
        header_border="#dceee0",
        header_label_color="#2e7d32",
        body_html=body_html,
        cta_label="View in GentleTap",
        cta_url=data.dashboard_url,
        footer_html="GentleTap · Synced from QuickBooks",
    )
    return plain, html_doc


@dataclass(frozen=True)
class PaymentFailedEmailData:
    full_name: str
    amount: float
    currency: str
    billing_url: str


def render_payment_failed_bodies(data: PaymentFailedEmailData) -> tuple[str, str]:
    amount = format_currency(data.amount, data.currency)
    name = data.full_name.strip() or "there"
    plain = "\n".join(
        [
            f"Hi {name},",
            "",
            f"We couldn't process your GentleTap subscription payment of {amount}.",
            "Your account stays active for now, but we'll keep retrying the charge.",
            "To avoid interruption, please update your payment method.",
            "",
            f"Update payment method: {data.billing_url}",
            "",
            "— GentleTap",
        ]
    ).strip() + "\n"

    body_html = (
        f"<p style=\"margin:0 0 8px;\">Hi {html.escape(name)},</p>"
        f"<p style=\"margin:0 0 8px;\">We couldn't process your GentleTap subscription "
        f"payment of <strong>{html.escape(amount)}</strong>.</p>"
        f"<p style=\"margin:0;font-size:13px;color:#6b6560;\">"
        f"Your account stays active for now — update your payment method to avoid interruption.</p>"
    )
    html_doc = _render_card_html(
        page_title="Payment failed",
        header_label="Payment failed",
        header_value=amount,
        header_bg="#fbf0ec",
        header_border="#f3dcd2",
        header_label_color="#b3401f",
        body_html=body_html,
        cta_label="Update payment method",
        cta_url=data.billing_url,
        footer_html="GentleTap · Billing",
    )
    return plain, html_doc

