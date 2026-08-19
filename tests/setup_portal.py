import os, requests, json
from dotenv import dotenv_values
BASE = (dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/") + "/api"
EMAIL = "qa_portal_user@example.com"
PW = "Wetazz2026!"

s = requests.post(f"{BASE}/auth/signup", json={"email": EMAIL, "password": PW,
    "first_name": "QA", "last_name": "Portal", "phone": "+61 400 555 777"}, timeout=60)
print("signup", s.status_code, s.text[:200])
if s.status_code != 200:
    s = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PW}, timeout=60)
    print("login", s.status_code)
ctok = s.json()["token"]

o = requests.post(f"{BASE}/auth/login", json={"email": "owner@wetazz.com.au", "password": "Wetazz2026!"}, timeout=60).json()["token"]
OH = {"Authorization": f"Bearer {o}", "Content-Type": "application/json"}

custs = requests.get(f"{BASE}/customers", headers=OH, timeout=60).json()
cid = [c for c in custs if c.get("email") == EMAIL][0]["id"]
print("customer id", cid)

v = requests.post(f"{BASE}/vehicles", headers=OH, json={"customer_id": cid, "registration": "QAPRT1",
    "make": "Mazda", "model": "BT-50", "year": "2020", "colour": "Grey"}, timeout=60)
print("vehicle", v.status_code)
vid = v.json()["id"]

locs = requests.get(f"{BASE}/locations", timeout=60).json()
q = requests.post(f"{BASE}/quotes", headers=OH, json={"customer_id": cid, "vehicle_id": vid,
    "location_id": locs[0]["id"], "items": [{"description": "QA portal panel repair", "quantity": 1,
    "unit_price": 400, "total": 400, "kind": "LABOUR"}]}, timeout=60)
print("quote", q.status_code, q.json().get("quote_number"))
i = requests.post(f"{BASE}/invoices", headers=OH, json={"customer_id": cid, "vehicle_id": vid,
    "items": [{"description": "QA portal panel repair", "quantity": 1, "unit_price": 400,
    "total": 400, "kind": "LABOUR"}]}, timeout=60)
print("invoice", i.status_code, i.json().get("invoice_number"))

# customer can fetch own PDFs
CH = {"Authorization": f"Bearer {ctok}"}
for path in [f"/quotes/{q.json()['id']}/pdf", f"/invoices/{i.json()['id']}/pdf"]:
    r = requests.get(f"{BASE}{path}", headers=CH, timeout=90)
    print("own pdf", path, r.status_code, r.headers.get("content-type"), len(r.content))
print("CREDS:", EMAIL, PW)
