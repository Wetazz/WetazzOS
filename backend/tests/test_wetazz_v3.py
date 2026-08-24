"""
WETAZZ OS — iteration 3 test suite.
Covers: owner auth (new email), managed Resend email delivery on quote SENT / invoice create,
Twilio logged-only (NOT_CONFIGURED) SMS, digital signature sign-off on quotes (+job AUTHORISED,
403 cross-customer), signed Quote/Invoice PDFs, and Stripe shop cart checkout (pickup/ship/free-ship).
"""
import base64
import os
import re
import time
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

# A tiny but real PNG (10x4 green) data URL for the captured signature
_PNG = base64.b64encode(bytes.fromhex(
    "89504e470d0a1a0a0000000d494844520000000a00000004080200000091"
    "0d0a5b0000001a49444154789c6360a01dd800130c0c0c0c8c19a80600b4"
    "b4041f6a5f1d0a0000000049454e44ae426082"
)).decode()
SIG_DATA = f"data:image/png;base64,{_PNG}"


def _creds():
    """Parse staff credentials out of /app/memory/test_credentials.md (bullet format)."""
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing /app/memory/test_credentials.md")
    txt = p.read_text(encoding="utf-8")
    pairs = re.findall(r"([\w.@+-]+@[\w.-]+)\s*/\s*(\S+)", txt)
    out = {}
    for line in txt.splitlines():
        m = re.search(r"([\w.@+-]+@[\w.-]+)\s*/\s*(\S+)", line)
        if not m:
            continue
        role = "OWNER" if "owner" in line.lower() else ("TECHNICIAN" if "tech" in line.lower() else "OTHER")
        out.setdefault(role, (m.group(1), m.group(2)))
    if not out and pairs:
        out["OWNER"] = pairs[0]
    return out


def H(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


def _pdf_text(content: bytes) -> str:
    """Extract text from PDF bytes for content assertions."""
    import io as _io
    from pdfminer.high_level import extract_text
    return extract_text(_io.BytesIO(content)) or ""


@pytest.fixture(scope="module")
def owner():
    c = _creds().get("OWNER")
    assert c, "owner credentials not found in test_credentials.md"
    r = requests.post(f"{API}/auth/login", json={"email": c[0], "password": c[1]}, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"owner login failed {r.status_code}: {r.text[:300]}")
    return r.json()


# ================= AUTH =================
class TestOwnerAuth:
    def test_owner_login_returns_owner_role(self, owner):
        assert isinstance(owner["token"], str) and len(owner["token"]) > 20
        u = owner["user"]
        assert u["role"] == "OWNER", u
        assert u["email"] == _creds()["OWNER"][0].lower()

    def test_owner_email_is_new_account(self):
        assert _creds()["OWNER"][0] == "aaronsmithard309@gmail.com"

    def test_bad_password_rejected(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": _creds()["OWNER"][0], "password": "wrong-pass"}, timeout=60)
        assert r.status_code == 401, r.status_code


# ================= EMAIL + SMS + SIGNATURE + PDF E2E =================
class TestCommsSignaturePdf:
    ctx = {}

    def test_01_create_customer_and_vehicle(self, owner):
        t = owner["token"]
        r = requests.post(f"{API}/customers", headers=H(t), timeout=60, json={
            "first_name": "TEST_V3", "last_name": "Signer", "email": "delivered@resend.dev",
            "phone": "+61 400 000 993", "address": "9 Maxwell St Wellington NSW 2820",
            "customer_type": "PRIVATE", "preferred_contact": "EMAIL"})
        assert r.status_code in (200, 201), r.text[:300]
        self.ctx["cid"] = r.json()["id"]
        r = requests.post(f"{API}/vehicles", headers=H(t), timeout=60, json={
            "customer_id": self.ctx["cid"], "registration": "QAV993", "make": "Toyota",
            "model": "Hilux", "year": "2020", "colour": "White", "vin": "QATESTVIN000993"})
        assert r.status_code in (200, 201), r.text[:300]
        self.ctx["vid"] = r.json()["id"]

    def test_02_create_job_and_quote(self, owner):
        t = owner["token"]
        r = requests.post(f"{API}/jobs", headers=H(t), timeout=60, json={
            "customer_id": self.ctx["cid"], "vehicle_id": self.ctx["vid"],
            "job_type": "PANEL", "notes": "TEST_V3 job"})
        assert r.status_code in (200, 201), r.text[:300]
        job = r.json()
        assert job["status"] == "BOOKED"
        self.ctx["jid"] = job["id"]

        r = requests.post(f"{API}/quotes", headers=H(t), timeout=60, json={
            "customer_id": self.ctx["cid"], "vehicle_id": self.ctx["vid"], "job_id": job["id"],
            "deposit_required": 150, "notes": "TEST_V3 quote", "items": [
                {"description": "Bumper repair", "quantity": 1, "unit_price": 800,
                 "total": 800, "kind": "LABOUR"}]})
        assert r.status_code in (200, 201), r.text[:400]
        q = r.json()
        assert q["total"] == 880.0 and q["gst"] == 80.0
        self.ctx["qid"] = q["id"]
        self.ctx["qno"] = q["quote_number"]

    def test_03_quote_sent_creates_email_comm_status_sent(self, owner):
        t = owner["token"]
        r = requests.patch(f"{API}/quotes/{self.ctx['qid']}/status", headers=H(t), timeout=90,
                           json={"status": "SENT"})
        assert r.status_code == 200, r.text[:300]
        time.sleep(3)
        rows = requests.get(f"{API}/communications", headers=H(t), timeout=60).json()
        mine = [c for c in rows if c["customer_id"] == self.ctx["cid"]]
        emails = [c for c in mine if c["channel"] == "EMAIL" and c["workflow_kind"] == "QUOTE_SENT"]
        assert emails, f"no QUOTE_SENT email comm logged; got {[(c['channel'], c['workflow_kind']) for c in mine]}"
        assert emails[0]["status"] == "SENT", emails[0]
        assert emails[0]["provider"] == "resend"
        assert "_id" not in emails[0]

    def test_04_sms_comms_are_not_configured_never_sent(self, owner):
        t = owner["token"]
        rows = requests.get(f"{API}/communications", headers=H(t), timeout=60).json()
        sms = [c for c in rows if c["channel"] == "SMS" and c["direction"] == "OUT"]
        assert sms, "expected at least one outbound SMS comm (deposit required) to be logged"
        bad = [c for c in sms if c["status"] == "SENT"]
        assert not bad, f"SMS reported as SENT while Twilio is unconfigured: {bad[:2]}"
        assert all(c["status"] == "NOT_CONFIGURED" for c in sms), \
            {c["status"] for c in sms}

    def test_05_customer_cannot_sign_other_customers_quote(self):
        email = f"qa_v3_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/signup", timeout=60, json={
            "email": email, "password": "Wetazz2026!", "first_name": "QA",
            "last_name": "Outsider", "phone": "+61 400 111 222"})
        assert r.status_code in (200, 201), r.text[:300]
        tok = r.json()["token"]
        self.ctx["outsider_token"] = tok
        r = requests.post(f"{API}/quotes/{self.ctx['qid']}/sign", headers=H(tok), timeout=60,
                          json={"signature_data": SIG_DATA, "signature_name": "QA Outsider",
                                "method": "PORTAL"})
        assert r.status_code == 403, f"{r.status_code}: {r.text[:200]}"

    def test_06_sign_quote_sets_signature_approved_and_job_authorised(self, owner):
        t = owner["token"]
        r = requests.post(f"{API}/quotes/{self.ctx['qid']}/sign", headers=H(t), timeout=90,
                          json={"signature_data": SIG_DATA, "signature_name": "TEST_V3 Signer",
                                "method": "ONSITE"})
        assert r.status_code == 200, r.text[:300]
        sig = r.json()["signature"]
        assert sig["name"] == "TEST_V3 Signer" and sig["method"] == "ONSITE" and sig["signed_at"]

        q = requests.get(f"{API}/quotes/{self.ctx['qid']}", headers=H(t), timeout=60).json()
        assert q["status"] == "APPROVED", q["status"]
        assert q["signature"]["data"].startswith("data:image/png;base64,")
        assert q["signature"]["name"] == "TEST_V3 Signer"

        job = requests.get(f"{API}/jobs/{self.ctx['jid']}", headers=H(t), timeout=60).json()
        assert job["status"] == "AUTHORISED", job["status"]
        assert job["authorisation_signature"]["name"] == "TEST_V3 Signer"

    def test_07_sign_missing_quote_404(self, owner):
        r = requests.post(f"{API}/quotes/nope-xyz/sign", headers=H(owner["token"]), timeout=60,
                          json={"signature_data": SIG_DATA, "signature_name": "X"})
        assert r.status_code == 404, r.status_code

    def test_08_signed_quote_pdf(self, owner):
        p = requests.get(f"{API}/quotes/{self.ctx['qid']}/pdf", headers=H(owner["token"]), timeout=120)
        assert p.status_code == 200, p.text[:300]
        assert p.headers.get("content-type", "").startswith("application/pdf")
        assert p.content[:4] == b"%PDF" and len(p.content) > 1500
        self.ctx["quote_pdf_len"] = len(p.content)
        assert "TEST_V3 Signer" in _pdf_text(p.content), "signer name missing from signed quote PDF"

    def test_09_invoice_created_emails_customer(self, owner):
        t = owner["token"]
        r = requests.post(f"{API}/invoices", headers=H(t), timeout=90, json={
            "customer_id": self.ctx["cid"], "vehicle_id": self.ctx["vid"],
            "job_id": self.ctx["jid"], "quote_id": self.ctx["qid"],
            "items": [{"description": "Bumper repair", "quantity": 1, "unit_price": 800,
                       "total": 800, "kind": "LABOUR"}]})
        assert r.status_code in (200, 201), r.text[:400]
        inv = r.json()
        assert inv["total"] == 880.0
        self.ctx["iid"] = inv["id"]
        time.sleep(3)
        rows = requests.get(f"{API}/communications", headers=H(t), timeout=60).json()
        created = [c for c in rows if c["customer_id"] == self.ctx["cid"]
                   and c["workflow_kind"] == "INVOICE_CREATED" and c["channel"] == "EMAIL"]
        assert created, "no INVOICE_CREATED email comm"
        assert created[0]["status"] == "SENT", created[0]

    def test_10_invoice_pdf_with_embedded_signature(self, owner):
        p = requests.get(f"{API}/invoices/{self.ctx['iid']}/pdf", headers=H(owner["token"]), timeout=120)
        assert p.status_code == 200, p.text[:300]
        assert p.headers.get("content-type", "").startswith("application/pdf")
        assert p.content[:4] == b"%PDF" and len(p.content) > 1500
        txt = _pdf_text(p.content)
        assert "TEST_V3 Signer" in txt, "signer name missing from invoice PDF"
        assert "AUTHORISED BY CUSTOMER" in txt.upper(), txt[:400]

    def test_11_pdf_requires_auth(self):
        assert requests.get(f"{API}/quotes/{self.ctx['qid']}/pdf", timeout=60).status_code in (401, 403)
        assert requests.get(f"{API}/invoices/{self.ctx['iid']}/pdf", timeout=60).status_code in (401, 403)

    def test_12_outsider_cannot_read_quote_pdf(self):
        tok = self.ctx.get("outsider_token")
        assert tok
        r = requests.get(f"{API}/quotes/{self.ctx['qid']}/pdf", headers=H(tok), timeout=60)
        assert r.status_code == 403, r.status_code


# ================= SHOP =================
class TestShop:
    def test_products(self):
        r = requests.get(f"{API}/shop/products", timeout=60)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert len(d["products"]) == 3, d
        assert d["shipping_flat"] == 14.99 and d["free_ship_threshold"] == 150.0
        ids = {p["id"] for p in d["products"]}
        assert ids == {"wz-tee", "wz-cap", "wz-hoodie"}, ids
        for p in d["products"]:
            assert p["price"] > 0 and p["name"] and p["sku"]

    def test_checkout_ship_under_threshold_adds_shipping(self):
        r = requests.post(f"{API}/shop/checkout", timeout=90, json={
            "items": [{"id": "wz-cap", "quantity": 1}], "fulfilment": "SHIP",
            "origin_url": BASE_URL})
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["subtotal"] == 35.0 and d["shipping"] == 14.99 and d["total"] == 49.99, d
        assert d["checkout_url"].startswith("https://") and "stripe" in d["checkout_url"], d["checkout_url"]
        assert d["session_id"]

    def test_checkout_ship_over_threshold_free(self):
        r = requests.post(f"{API}/shop/checkout", timeout=90, json={
            "items": [{"id": "wz-hoodie", "quantity": 2}], "fulfilment": "SHIP",
            "origin_url": BASE_URL})
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["subtotal"] == 178.0 and d["shipping"] == 0.0 and d["total"] == 178.0, d
        assert "stripe" in d["checkout_url"]

    def test_checkout_pickup_always_free(self):
        r = requests.post(f"{API}/shop/checkout", timeout=90, json={
            "items": [{"id": "wz-tee", "quantity": 1}], "fulfilment": "PICKUP",
            "origin_url": BASE_URL})
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["shipping"] == 0.0 and d["total"] == 45.0, d

    def test_checkout_empty_cart_400(self):
        r = requests.post(f"{API}/shop/checkout", timeout=60,
                          json={"items": [], "fulfilment": "PICKUP", "origin_url": BASE_URL})
        assert r.status_code == 400, r.status_code

    def test_checkout_unknown_product_400(self):
        r = requests.post(f"{API}/shop/checkout", timeout=60, json={
            "items": [{"id": "bogus", "quantity": 1}], "fulfilment": "PICKUP",
            "origin_url": BASE_URL})
        assert r.status_code == 400, r.status_code

    def test_checkout_invalid_quantity_422(self):
        r = requests.post(f"{API}/shop/checkout", timeout=60, json={
            "items": [{"id": "wz-tee", "quantity": 0}], "fulfilment": "PICKUP",
            "origin_url": BASE_URL})
        assert r.status_code == 422, r.status_code


# ================= REGRESSION =================
class TestRegression:
    def test_settings_get_and_save(self, owner):
        t = owner["token"]
        r = requests.get(f"{API}/settings", headers=H(t), timeout=60)
        assert r.status_code == 200, r.text[:200]
        original = r.json()
        r = requests.patch(f"{API}/settings", headers=H(t), timeout=60,
                         json={**original, "business_phone": original.get("business_phone", "")})
        assert r.status_code == 200, r.text[:300]

    def test_release_form_create_pdf_sign(self, owner):
        t = owner["token"]
        r = requests.post(f"{API}/customers", headers=H(t), timeout=60, json={
            "first_name": "TEST_V3RF", "last_name": "Release", "email": "test_v3rf@example.com",
            "phone": "+61 400 000 994", "customer_type": "PRIVATE", "preferred_contact": "EMAIL"})
        assert r.status_code in (200, 201), r.text[:300]
        cid = r.json()["id"]
        r = requests.post(f"{API}/vehicles", headers=H(t), timeout=60, json={
            "customer_id": cid, "registration": "QAV994", "make": "Mazda", "model": "3"})
        assert r.status_code in (200, 201), r.text[:300]
        vid = r.json()["id"]
        r = requests.post(f"{API}/release-forms", headers=H(t), timeout=60, json={
            "customer_id": cid, "vehicle_id": vid, "notes": "TEST_V3 release"})
        assert r.status_code in (200, 201), r.text[:300]
        rid = r.json()["id"]
        p = requests.get(f"{API}/release-forms/{rid}/pdf", headers=H(t), timeout=120)
        assert p.status_code == 200 and p.content[:4] == b"%PDF", p.status_code
        s = requests.patch(f"{API}/release-forms/{rid}/sign", headers=H(t), timeout=60,
                           json={"signature_name": "TEST_V3 Signer"})
        assert s.status_code == 200, s.text[:200]
        rows = requests.get(f"{API}/release-forms", headers=H(t), timeout=60).json()
        row = [x for x in rows if x["id"] == rid][0]
        assert row["status"] == "SIGNED" and row["signature_name"] == "TEST_V3 Signer"

    def test_quotes_and_invoices_lists(self, owner):
        t = owner["token"]
        for path in ("quotes", "invoices"):
            r = requests.get(f"{API}/{path}", headers=H(t), timeout=60)
            assert r.status_code == 200, f"{path}: {r.text[:200]}"
            assert isinstance(r.json(), list)
