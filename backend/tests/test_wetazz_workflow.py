"""
Wetazz OS iteration 2 backend tests: automation comms, aggregation, portal, leads, integrations status.
Uses live public REACT_APP_BACKEND_URL.
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"
OWNER = {"email": "owner@wetazz.com.au", "password": "Wetazz2026!"}


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    sess.post(f"{API}/seed", timeout=30)
    return sess


@pytest.fixture(scope="session")
def owner_token(s):
    r = s.post(f"{API}/auth/login", json=OWNER, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def owner(owner_token):
    ns = requests.Session()
    ns.headers.update({"Content-Type": "application/json",
                       "Authorization": f"Bearer {owner_token}"})
    return ns


@pytest.fixture(scope="session")
def customer_signup(s):
    email = f"cust_{uuid.uuid4().hex[:8]}@test.com"
    payload = {"email": email, "password": "Test1234!",
               "first_name": "Test", "last_name": "Cust", "phone": "0400000000"}
    r = s.post(f"{API}/auth/signup", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"signup: {r.status_code} {r.text}"
    return r.json(), payload


@pytest.fixture(scope="session")
def customer(customer_signup):
    tok = customer_signup[0]["token"]
    ns = requests.Session()
    ns.headers.update({"Content-Type": "application/json",
                       "Authorization": f"Bearer {tok}"})
    return ns


# ---------- config ----------
def test_business_email(s):
    r = s.get(f"{API}/business", timeout=15)
    assert r.status_code == 200
    assert r.json().get("email") == "Office@wetazz.com.au"


def test_integrations_status(owner):
    r = owner.get(f"{API}/integrations/status", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["email"]["configured"] is False
    assert d["sms"]["configured"] is False
    assert d["rego_lookup"]["configured"] is False
    assert d["stripe"]["configured"] is True
    assert d["ai"]["configured"] is True
    assert "Office@wetazz.com.au" in (d["email"].get("sender") or "")


def test_integrations_status_rbac(customer):
    r = customer.get(f"{API}/integrations/status", timeout=15)
    assert r.status_code == 403


# ---------- signup no 500 ----------
def test_signup_no_500(s):
    email = f"su_{uuid.uuid4().hex[:8]}@test.com"
    r = s.post(f"{API}/auth/signup",
               json={"email": email, "password": "Test1234!",
                     "first_name": "SU", "last_name": "Test",
                     "phone": "0499000111"}, timeout=15)
    assert r.status_code in (200, 201), f"{r.status_code}: {r.text}"
    assert "token" in r.json()


# ---------- public enquiry + leads ----------
def test_public_enquiry_and_leads(s, owner):
    payload = {"first_name": "TEST", "last_name": "Enq",
               "email": f"enq_{uuid.uuid4().hex[:6]}@test.com",
               "phone": "0411222333", "message": "Need quote for scratch"}
    r = s.post(f"{API}/public/enquiries", json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    lead_id = r.json().get("lead_id")
    assert lead_id
    lr = owner.get(f"{API}/leads", timeout=15)
    assert lr.status_code == 200
    leads = lr.json()
    match = [l for l in leads if l.get("id") == lead_id]
    assert match, "created lead not in /api/leads"
    assert isinstance(match[0].get("customer"), dict)


def test_leads_rbac(customer):
    r = customer.get(f"{API}/leads", timeout=15)
    assert r.status_code == 403


# ---------- E2E workflow ----------
@pytest.fixture(scope="session")
def workflow(owner):
    ctx = {}
    r = owner.post(f"{API}/customers",
                   json={"first_name": "Workflow", "last_name": "Cust",
                         "email": f"wf_{uuid.uuid4().hex[:6]}@test.com",
                         "phone": "0422111000",
                         "preferred_contact": "EMAIL"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    ctx["cid"] = r.json()["id"]
    r = owner.post(f"{API}/vehicles",
                   json={"customer_id": ctx["cid"],
                         "registration": f"WF{uuid.uuid4().hex[:4].upper()}",
                         "make": "Toyota", "model": "Corolla",
                         "year": 2020, "colour": "white"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    ctx["vid"] = r.json()["id"]
    r = owner.post(f"{API}/bookings",
                   json={"customer_id": ctx["cid"], "vehicle_id": ctx["vid"],
                         "service_type": "PANEL_REPAIR",
                         "booking_type": "REPAIR",
                         "preferred_date": "2026-03-15",
                         "preferred_time": "09:00",
                         "contact_method": "EMAIL",
                         "bay_kind": "PANEL",
                         "description": "workflow test"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    ctx["bid"] = r.json()["id"]
    return ctx


def _get_comms(owner, customer_id=None):
    r = owner.get(f"{API}/communications", timeout=15)
    assert r.status_code == 200, r.text
    all_comms = r.json()
    if customer_id:
        return [c for c in all_comms if c.get("customer_id") == customer_id]
    return all_comms


def _has_template(comms, name):
    return [c for c in comms
            if str(c.get("workflow_kind") or c.get("template") or "").upper() == name.upper()]


def test_booking_confirmation_comm(owner, workflow):
    comms = _get_comms(owner, workflow["cid"])
    bc = _has_template(comms, "BOOKING_CONFIRMATION")
    assert bc, f"no BOOKING_CONFIRMATION; templates seen: {sorted({c.get('template') for c in comms})}"
    channels = {c.get("channel") for c in bc}
    assert "EMAIL" in channels, "expected EMAIL channel"
    for c in bc:
        assert str(c.get("status", "")).upper() == "NOT_CONFIGURED", \
            f"expected NOT_CONFIGURED, got {c.get('status')}"


def test_confirm_booking_triggers_comm(owner, workflow):
    r = owner.patch(f"{API}/bookings/{workflow['bid']}",
                    json={"status": "CONFIRMED"}, timeout=15)
    assert r.status_code == 200, r.text
    time.sleep(0.3)
    comms = _get_comms(owner, workflow["cid"])
    assert _has_template(comms, "BOOKING_CONFIRMED"), \
        f"no BOOKING_CONFIRMED; templates={sorted({c.get('template') for c in comms})}"


def test_create_job_and_labour(owner, workflow):
    r = owner.post(f"{API}/jobs",
                   json={"customer_id": workflow["cid"], "vehicle_id": workflow["vid"],
                         "booking_id": workflow["bid"],
                         "job_type": "PANEL_REPAIR",
                         "private_or_insurance": "PRIVATE",
                         "notes": "Panel workflow"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    workflow["jid"] = r.json()["id"]
    rs = owner.post(f"{API}/jobs/{workflow['jid']}/labour/start", timeout=15)
    assert rs.status_code in (200, 201), rs.text
    time.sleep(1)
    rp = owner.post(f"{API}/jobs/{workflow['jid']}/labour/stop", timeout=15)
    assert rp.status_code in (200, 201), rp.text


def test_assign_job(owner, workflow):
    staff = owner.get(f"{API}/staff", timeout=15).json()
    staff_id = staff[0]["id"] if staff else None
    r = owner.patch(f"{API}/jobs/{workflow['jid']}/assign",
                    json={"assigned_staff_id": staff_id,
                          "bay": "Bay 1", "priority": "HIGH"}, timeout=15)
    assert r.status_code == 200, r.text
    j = owner.get(f"{API}/jobs/{workflow['jid']}", timeout=15).json()
    assert j.get("bay") == "Bay 1"
    assert j.get("priority") == "HIGH"
    if staff_id:
        assert isinstance(j.get("assigned_staff"), dict)
        assert j["assigned_staff"].get("id") == staff_id


def test_job_labour_metrics(owner, workflow):
    j = owner.get(f"{API}/jobs/{workflow['jid']}", timeout=15).json()
    for k in ("labour_hours", "labour_revenue",
              "labour_estimated_hours", "labour_variance_hours"):
        assert k in j, f"missing {k}"


def test_create_and_send_quote(owner, workflow):
    payload = {"customer_id": workflow["cid"], "vehicle_id": workflow["vid"],
               "job_id": workflow["jid"],
               "items": [
                   {"kind": "LABOUR", "description": "Sand & paint",
                    "quantity": 4, "unit_price": 120, "total": 480},
                   {"kind": "PART", "description": "Bumper clip",
                    "quantity": 2, "unit_price": 15, "total": 30}],
               "deposit_required": 250}
    r = owner.post(f"{API}/quotes", json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    workflow["qid"] = r.json()["id"]
    r = owner.patch(f"{API}/quotes/{workflow['qid']}/status",
                    json={"status": "SENT"}, timeout=15)
    assert r.status_code == 200, r.text
    time.sleep(0.3)
    comms = _get_comms(owner, workflow["cid"])
    assert _has_template(comms, "QUOTE_SENT"), \
        f"no QUOTE_SENT; templates={sorted({c.get('template') for c in comms})}"


def test_approve_quote_deposit_comm(owner, workflow):
    r = owner.patch(f"{API}/quotes/{workflow['qid']}/status",
                    json={"status": "APPROVED"}, timeout=15)
    assert r.status_code == 200, r.text
    time.sleep(0.3)
    comms = _get_comms(owner, workflow["cid"])
    assert _has_template(comms, "DEPOSIT_REQUIRED"), \
        f"no DEPOSIT_REQUIRED; templates={sorted({c.get('template') for c in comms})}"


def test_ready_for_collection(owner, workflow):
    r = owner.patch(f"{API}/jobs/{workflow['jid']}/status",
                    json={"status": "READY_FOR_COLLECTION"}, timeout=15)
    assert r.status_code == 200, r.text
    time.sleep(0.3)
    comms = _get_comms(owner, workflow["cid"])
    assert _has_template(comms, "READY_FOR_COLLECTION")


def test_completed_creates_review(owner, workflow):
    r = owner.patch(f"{API}/jobs/{workflow['jid']}/status",
                    json={"status": "COMPLETED"}, timeout=15)
    assert r.status_code == 200, r.text
    time.sleep(0.3)
    comms = _get_comms(owner, workflow["cid"])
    assert _has_template(comms, "REVIEW_REQUEST")
    rr = owner.get(f"{API}/reviews", timeout=15)
    assert rr.status_code == 200
    reviews = rr.json()
    assert any(rv.get("job_id") == workflow["jid"] for rv in reviews), \
        "no review auto-created"


def test_invoice_created_comm(owner, workflow):
    r = owner.post(f"{API}/invoices",
                   json={"customer_id": workflow["cid"], "vehicle_id": workflow["vid"],
                         "job_id": workflow["jid"],
                         "items": [{"kind": "LABOUR", "description": "Repair",
                                    "quantity": 1, "unit_price": 500, "total": 500}]},
                   timeout=15)
    assert r.status_code in (200, 201), r.text
    time.sleep(0.3)
    comms = _get_comms(owner, workflow["cid"])
    assert _has_template(comms, "INVOICE_CREATED"), \
        f"no INVOICE_CREATED; templates={sorted({c.get('template') for c in comms})}"


def test_customer_full_history(owner, workflow):
    r = owner.get(f"{API}/customers/{workflow['cid']}", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("vehicles", "jobs", "quotes", "invoices", "bookings",
              "communications", "reviews", "leads", "payments"):
        assert k in d, f"missing {k}: keys={list(d.keys())}"
        assert isinstance(d[k], list)
    assert d["vehicles"], "no vehicles in aggregate"
    assert d["jobs"], "no jobs in aggregate"


def test_vehicle_full_detail(owner, workflow):
    r = owner.get(f"{API}/vehicles/{workflow['vid']}", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("customer", "jobs", "quotes", "invoices", "bookings",
              "photos", "documents", "communications"):
        assert k in d, f"missing {k}"


# ---------- analytics dashboard ----------
def test_dashboard_kpis(owner):
    r = owner.get(f"{API}/analytics/dashboard", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("quotes_awaiting_approval", "deposits_outstanding_count",
              "deposits_outstanding_amount", "new_leads", "conversion_rate",
              "jobs_overdue", "staff_workload"):
        assert k in d, f"missing {k}"
    assert isinstance(d["staff_workload"], dict)


def test_dashboard_rbac(customer):
    r = customer.get(f"{API}/analytics/dashboard", timeout=15)
    assert r.status_code == 403


def test_customers_rbac(customer):
    r = customer.get(f"{API}/customers", timeout=15)
    assert r.status_code == 403


# ---------- portal /me ----------
def test_me_messages(customer):
    r = customer.get(f"{API}/me/messages", timeout=15)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_me_payments(customer):
    r = customer.get(f"{API}/me/payments", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    for p in data:
        assert "amount" in p


def test_me_documents(customer):
    r = customer.get(f"{API}/me/documents", timeout=15)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_me_profile_update(customer):
    r = customer.patch(f"{API}/me/profile",
                       json={"first_name": "Updated",
                             "phone": "0499111222"}, timeout=15)
    assert r.status_code == 200, r.text


def test_owner_update_customer(owner, workflow):
    r = owner.patch(f"{API}/customers/{workflow['cid']}",
                    json={"phone": "0455999888", "notes": "vip"}, timeout=15)
    assert r.status_code == 200, r.text
    d = owner.get(f"{API}/customers/{workflow['cid']}", timeout=15).json()
    assert d.get("phone") == "0455999888"
