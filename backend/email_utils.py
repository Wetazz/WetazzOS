"""Emergent-managed email (Resend) — async, non-blocking, with the mandatory
guardrail gate. Sender address is platform-managed; we set the display name only.
"""
import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

logger = logging.getLogger("wetazz.email")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Wetazz Paint Panel & Mechanical")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


def is_configured() -> bool:
    return bool(EMAIL_KEY)


def render_email(body_text: str, heading: str = "") -> str:
    """Wrap a plain-text server-side message into a safe branded HTML email.
    A single first-party portal link is added; body text is escaped (no anchors)."""
    safe_body = escape(body_text).replace("\n", "<br/>")
    portal = f"{APP_BASE_URL}/portal" if APP_BASE_URL.startswith("https://") else ""
    button = (f'<p style="margin:20px 0"><a href="{portal}" style="display:inline-block;'
              f'background:#3F9E12;color:#ffffff;padding:11px 20px;text-decoration:none;'
              f'font-family:Arial,sans-serif;font-size:14px">Open your portal</a></p>') if portal else ""
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
        f'<td style="padding:28px;font-family:Arial,Helvetica,sans-serif;color:#141414;max-width:600px">'
        f'<div style="font-size:20px;font-weight:bold;color:#3F9E12;margin-bottom:6px">WETAZZ</div>'
        f'<div style="font-size:11px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:18px">Paint &middot; Panel &middot; Mechanical</div>'
        + (f'<h2 style="font-size:17px;margin:0 0 12px">{escape(heading)}</h2>' if heading else "")
        + f'<p style="font-size:14px;line-height:1.55">{safe_body}</p>'
        + button
        + f'<p style="font-size:12px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:12px">'
        f'Sent by {escape(EMAIL_FROM_NAME)}. We never ask for your password or card details by email.</p>'
        f'</td></tr></table>'
    )


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    if not EMAIL_KEY:
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                 headers={"X-Email-Key": EMAIL_KEY}, json=payload)
    resp.raise_for_status()
    return resp.json().get("id")
