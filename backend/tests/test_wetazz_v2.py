"""
WETAZZ OS — iteration 2 test suite.
Covers: LOCATIONS, SETTINGS, AI photo-estimate (+lead), relational E2E with branded PDFs
(quote/invoice/release form), RBAC on PDFs.
"""
import base64
import io
import os
import re
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


# ---------------- helpers / fixtures ----------------
def _creds():
    p = Path("/app/memory/test_credentials.md")
    txt = p.read_text(encoding="utf-8")
    emails = re.findall(r"Email:\s*`([^`]+)`", txt)
    pwds = re.findall(r"Password:\s*`([^`]+)`", txt)
    return emails, pwds


@pytest.fixture(scope="module")
def owner_token():
    emails, pwds = _creds()
    r = requests.post(f"{API}/auth/login", json={"email": emails[0], "password": pwds[0]}, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"owner login failed {r.status_code}: {r.text[:300]}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def tech_token():
    emails, pwds = _creds()
    r = requests.post(f"{API}/auth/login", json={"email": emails[1], "password": pwds[1]}, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"tech login failed {r.status_code}: {r.text[:300]}")
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


def make_image_b64(w=420, h=320, seed=1):
    """Real-looking JPEG of a dented panel-ish scene (not a 1x1 pixel)."""
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (w, h), (120 + seed * 10, 125, 135))
    d = ImageDraw.Draw(img)
    d.rectangle([20, 140, w - 20, h - 20], fill=(60, 62, 70))
    d.ellipse([120 + seed * 5, 60, 260 + seed * 5, 170], fill=(30, 30, 34))
    d.line([40, 200, w - 40, 190], fill=(220, 220, 220), width=6)
    d.line([90, 120, 300, 260], fill=(200, 40, 40), width=4)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    return base64.b64encode(buf.getvalue()).decode()


# ================= LOCATIONS =================
class TestLocations:
    created = []

    def test_get_locations_has_wellington_primary(self):
        r = requests.get(f"{API}/locations", timeout=60)
        assert r.status_code == 200, r.text[:300]
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        wellington = [l for l in rows if l["name"].lower() == "wellington"]
        assert wellington, f"Wellington location missing: {rows}"
        w = wellington[0]
        assert w["is_primary"] is True
        assert w["postcode"] == "2820"
        assert w["state"] == "NSW"
        assert all("_id" not in l for l in rows)

    def test_owner_create_patch_delete_location(self, owner_token):
        payload = {"name": "TEST_Dubbo", "address": "1 Test St", "suburb": "Dubbo",
                   "state": "NSW", "postcode": "2830", "phone": "+61 2 1111 1111",
                   "is_primary": False}
        r = requests.post(f"{API}/locations", json=payload, headers=H(owner_token), timeout=60)
        assert r.status_code == 200, r.text[:300]
        loc = r.json()
        assert loc["name"] == "TEST_Dubbo" and loc["postcode"] == "2830"
        lid = loc["id"]
        TestLocations.created.append(lid)

        # verify persisted via GET
        rows = requests.get(f"{API}/locations", timeout=60).json()
        assert any(l["id"] == lid for l in rows)

        # PATCH set primary -> only one primary
        r = requests.patch(f"{API}/locations/{lid}", json={"is_primary": True},
                           headers=H(owner_token), timeout=60)
        assert r.status_code == 200, r.text[:300]
        rows = requests.get(f"{API}/locations", timeout=60).json()
        primaries = [l for l in rows if l.get("is_primary")]
        assert len(primaries) == 1 and primaries[0]["id"] == lid

        # restore Wellington as primary
        well = [l for l in rows if l["name"].lower() == "wellington"][0]
        requests.patch(f"{API}/locations/{well['id']}", json={"is_primary": True},
                       headers=H(owner_token), timeout=60)

        # DELETE (soft) -> disappears from active list
        r = requests.delete(f"{API}/locations/{lid}", headers=H(owner_token), timeout=60)
        assert r.status_code == 200, r.text[:300]
        rows = requests.get(f"{API}/locations", timeout=60).json()
        assert not any(l["id"] == lid for l in rows)
        assert [l for l in rows if l["name"].lower() == "wellington"][0]["is_primary"] is True

    def test_technician_forbidden_on_location_writes(self, tech_token):
        r = requests.post(f"{API}/locations", json={"name": "TEST_NoPerm"},
                          headers=H(tech_token), timeout=60)
        assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text[:200]}"
        r = requests.patch(f"{API}/locations/xyz", json={"name": "x"}, headers=H(tech_token), timeout=60)
        assert r.status_code == 403
        r = requests.delete(f"{API}/locations/xyz", headers=H(tech_token), timeout=60)
        assert r.status_code == 403

    def test_location_writes_require_auth(self):
        r = requests.post(f"{API}/locations", json={"name": "TEST_Anon"}, timeout=60)
        assert r.status_code in (401, 403), r.status_code


# ================= SETTINGS =================
class TestSettings:
    def test_get_settings_staff(self, owner_token):
        r = requests.get(f"{API}/settings", headers=H(owner_token), timeout=60)
        assert r.status_code == 200, r.text[:300]
        s = r.json()
        for k in ["business_name", "email", "phone", "terms_quote", "terms_invoice", "terms_release"]:
            assert k in s, f"missing {k}"
            assert s[k] is not None
        assert "_id" not in s
        assert len(s["terms_quote"]) > 20

    def test_patch_settings_persists_owner(self, owner_token):
        orig = requests.get(f"{API}/settings", headers=H(owner_token), timeout=60).json()
        new_terms = orig["terms_quote"] + "\nTEST_CLAUSE_QA"
        r = requests.patch(f"{API}/settings", json={"terms_quote": new_terms, "phone": "+61 2 6845 0000"},
                           headers=H(owner_token), timeout=60)
        assert r.status_code == 200, r.text[:300]
        assert r.json()["terms_quote"] == new_terms
        got = requests.get(f"{API}/settings", headers=H(owner_token), timeout=60).json()
        assert got["terms_quote"] == new_terms
        assert got["phone"] == "+61 2 6845 0000"
        # restore
        requests.patch(f"{API}/settings", json={"terms_quote": orig["terms_quote"],
                                                "phone": orig.get("phone", "")},
                       headers=H(owner_token), timeout=60)

    def test_technician_cannot_patch_settings(self, tech_token):
        r = requests.get(f"{API}/settings", headers=H(tech_token), timeout=60)
        assert r.status_code == 200, "technician should read settings"
        r = requests.patch(f"{API}/settings", json={"business_name": "HACKED"},
                           headers=H(tech_token), timeout=60)
        assert r.status_code == 403, f"expected 403 got {r.status_code}"


# ================= AI PHOTO ESTIMATE =================
class TestAiEstimate:
    def test_rejects_no_images(self):
        r = requests.post(f"{API}/ai/photo-estimate", json={"images_base64": [], "description": "dent"}, timeout=120)
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"

    def test_photo_estimate_creates_lead_and_customer(self, owner_token):
        phone = "+61 400 000 991"
        payload = {
            "images_base64": [make_image_b64(seed=1), make_image_b64(seed=3)],
            "full_name": "TEST QaEstimator",
            "contact_number": phone,
            "registration": "TST991",
            "vehicle_make": "Toyota", "vehicle_model": "Hilux", "vehicle_year": "2019",
            "vehicle_details": "White dual cab, damage to rear left quarter",
            "description": "Reversed into a post, deep scrape and dent",
        }
        r = requests.post(f"{API}/ai/photo-estimate", json=payload, timeout=180)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        body = r.json()
        assert "id" in body and body["id"]
        assert "disclaimer" in body and "NOT CONFIRMED" in body["disclaimer"].upper()
        assert body.get("estimate") or body.get("raw"), "neither estimate nor raw returned"
        if body.get("estimate"):
            est = body["estimate"]
            assert "summary" in est
            assert est.get("price_low_aud") is not None

        # lead created with AI_ESTIMATE source
        leads = requests.get(f"{API}/leads", headers=H(owner_token), timeout=60)
        assert leads.status_code == 200, leads.text[:200]
        rows = leads.json()
        mine = [l for l in rows if l.get("reference_id") == body["id"]]
        assert mine, "no lead created for AI estimate"
        assert mine[0]["source"] == "AI_ESTIMATE"
        assert mine[0]["customer_id"]

        # customer record created
        cust = requests.get(f"{API}/customers", headers=H(owner_token), timeout=60).json()
        assert any(c.get("phone") == phone for c in cust), "customer not created from AI estimate"

        # estimate listed for staff
        ests = requests.get(f"{API}/ai/estimates", headers=H(owner_token), timeout=60)
        assert ests.status_code == 200
        assert any(e["id"] == body["id"] for e in ests.json())

    def test_estimates_list_requires_staff(self):
        r = requests.get(f"{API}/ai/estimates", timeout=60)
        assert r.status_code in (401, 403)


# ================= E2E RELATIONAL + PDFs =================
class TestE2EDocsPdf:
    ctx = {}

    def test_01_create_customer_vehicle(self, owner_token):
        r = requests.post(f"{API}/customers", headers=H(owner_token), timeout=60, json={
            "first_name": "TEST_Pdf", "last_name": "Customer", "email": "test_pdf_qa@example.com",
            "phone": "+61 400 000 992", "address": "5 Maxwell St Wellington NSW 2820",
            "customer_type": "PRIVATE", "preferred_contact": "EMAIL"})
        assert r.status_code in (200, 201), r.text[:300]
        cid = r.json()["id"]
        TestE2EDocsPdf.ctx["cid"] = cid

        r = requests.post(f"{API}/vehicles", headers=H(owner_token), timeout=60, json={
            "customer_id": cid, "registration": "QAP992", "make": "Ford", "model": "Ranger",
            "year": "2021", "colour": "Blue", "vin": "QATESTVIN000992"})
        assert r.status_code in (200, 201), r.text[:300]
        TestE2EDocsPdf.ctx["vid"] = r.json()["id"]

    def test_02_quote_with_location_and_pdf(self, owner_token):
        loc = requests.get(f"{API}/locations", timeout=60).json()[0]
        TestE2EDocsPdf.ctx["loc_id"] = loc["id"]
        r = requests.post(f"{API}/quotes", headers=H(owner_token), timeout=60, json={
            "customer_id": TestE2EDocsPdf.ctx["cid"], "vehicle_id": TestE2EDocsPdf.ctx["vid"],
            "location_id": loc["id"], "deposit_required": 200,
            "notes": "TEST_QA quote", "items": [
                {"description": "Rear quarter panel repair", "quantity": 1, "unit_price": 900,
                 "total": 900, "kind": "LABOUR"},
                {"description": "Two pack paint", "quantity": 1, "unit_price": 300,
                 "total": 300, "kind": "MATERIAL"}]})
        assert r.status_code in (200, 201), r.text[:400]
        q = r.json()
        assert q["subtotal"] == 1200 and q["gst"] == 120.0 and q["total"] == 1320.0
        assert q["location_id"] == loc["id"]
        TestE2EDocsPdf.ctx["qid"] = q["id"]

        p = requests.get(f"{API}/quotes/{q['id']}/pdf", headers=H(owner_token), timeout=90)
        assert p.status_code == 200, f"{p.status_code}: {p.text[:400]}"
        assert p.headers.get("content-type", "").startswith("application/pdf"), p.headers
        assert p.content[:4] == b"%PDF" and len(p.content) > 1500

    def test_03_invoice_and_pdf(self, owner_token):
        r = requests.post(f"{API}/invoices", headers=H(owner_token), timeout=60, json={
            "customer_id": TestE2EDocsPdf.ctx["cid"], "vehicle_id": TestE2EDocsPdf.ctx["vid"],
            "quote_id": TestE2EDocsPdf.ctx["qid"], "location_id": TestE2EDocsPdf.ctx["loc_id"],
            "items": [{"description": "Rear quarter panel repair", "quantity": 1,
                       "unit_price": 900, "total": 900, "kind": "LABOUR"}]})
        assert r.status_code in (200, 201), r.text[:400]
        inv = r.json()
        assert inv["gst"] == 90.0 and inv["total"] == 990.0 and inv["balance"] == 990.0
        TestE2EDocsPdf.ctx["iid"] = inv["id"]

        p = requests.get(f"{API}/invoices/{inv['id']}/pdf", headers=H(owner_token), timeout=90)
        assert p.status_code == 200, f"{p.status_code}: {p.text[:400]}"
        assert p.headers.get("content-type", "").startswith("application/pdf")
        assert p.content[:4] == b"%PDF"

    def test_04_release_form_create_pdf_sign(self, owner_token):
        r = requests.post(f"{API}/release-forms", headers=H(owner_token), timeout=60, json={
            "customer_id": TestE2EDocsPdf.ctx["cid"], "vehicle_id": TestE2EDocsPdf.ctx["vid"],
            "location_id": TestE2EDocsPdf.ctx["loc_id"], "odometer": "88123",
            "work_summary": "TEST_QA rear quarter repaint and blend", "amount_due": 990.0})
        assert r.status_code in (200, 201), r.text[:400]
        rf = r.json()
        assert rf["status"] == "DRAFT"
        assert rf["release_number"].startswith("RF-")
        rid = rf["id"]

        rows = requests.get(f"{API}/release-forms", headers=H(owner_token), timeout=60)
        assert rows.status_code == 200
        found = [x for x in rows.json() if x["id"] == rid]
        assert found, "release form not in list"
        assert found[0]["customer"]["first_name"] == "TEST_Pdf"
        assert found[0]["vehicle"]["registration"] == "QAP992"

        p = requests.get(f"{API}/release-forms/{rid}/pdf", headers=H(owner_token), timeout=90)
        assert p.status_code == 200, f"{p.status_code}: {p.text[:400]}"
        assert p.headers.get("content-type", "").startswith("application/pdf")
        assert p.content[:4] == b"%PDF"

        s = requests.patch(f"{API}/release-forms/{rid}/sign", headers=H(owner_token), timeout=60,
                           json={"signature_name": "TEST_Pdf Customer"})
        assert s.status_code == 200, s.text[:300]
        got = requests.get(f"{API}/release-forms/{rid}", headers=H(owner_token), timeout=60).json()
        assert got["status"] == "SIGNED"
        assert got["signature_name"] == "TEST_Pdf Customer"
        assert got["signed_at"]

    def test_05_missing_doc_returns_404(self, owner_token):
        assert requests.get(f"{API}/quotes/nope-xyz/pdf", headers=H(owner_token), timeout=60).status_code == 404
        assert requests.get(f"{API}/invoices/nope-xyz/pdf", headers=H(owner_token), timeout=60).status_code == 404
        assert requests.get(f"{API}/release-forms/nope-xyz/pdf", headers=H(owner_token), timeout=60).status_code == 404

    def test_06_pdf_requires_auth(self):
        r = requests.get(f"{API}/quotes/{TestE2EDocsPdf.ctx['qid']}/pdf", timeout=60)
        assert r.status_code in (401, 403), r.status_code

    def test_07_other_customer_cannot_read_pdf(self, owner_token):
        email = "test_qa_other_992@example.com"
        s = requests.post(f"{API}/auth/signup", timeout=60, json={
            "email": email, "password": "Wetazz2026!", "first_name": "TEST_Other",
            "last_name": "Cust", "phone": "+61 400 000 993"})
        if s.status_code not in (200, 201):
            # already exists -> just login
            s = requests.post(f"{API}/auth/login", json={"email": email, "password": "Wetazz2026!"}, timeout=60)
        assert s.status_code == 200, f"signup/login failed {s.status_code}: {s.text[:300]}"
        tok = s.json().get("token")
        assert tok, s.text[:300]

        r = requests.get(f"{API}/quotes/{TestE2EDocsPdf.ctx['qid']}/pdf", headers=H(tok), timeout=60)
        assert r.status_code == 403, f"expected 403 got {r.status_code}"
        r = requests.get(f"{API}/invoices/{TestE2EDocsPdf.ctx['iid']}/pdf", headers=H(tok), timeout=60)
        assert r.status_code == 403, f"expected 403 got {r.status_code}"
        r = requests.get(f"{API}/release-forms", headers=H(tok), timeout=60)
        assert r.status_code == 403, f"customer should not list release forms, got {r.status_code}"
