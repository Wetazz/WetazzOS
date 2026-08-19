import requests
from pdfminer.high_level import extract_text
from dotenv import dotenv_values
BASE = (dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/") + "/api"
o = requests.post(f"{BASE}/auth/login", json={"email": "owner@wetazz.com.au", "password": "Wetazz2026!"}, timeout=60).json()["token"]
H = {"Authorization": f"Bearer {o}"}
q = requests.get(f"{BASE}/quotes", headers=H, timeout=60).json()[0]
inv = requests.get(f"{BASE}/invoices", headers=H, timeout=60).json()[0]
rf = requests.get(f"{BASE}/release-forms", headers=H, timeout=60).json()[0]
for kind, path in [("QUOTE", f"/quotes/{q['id']}/pdf"), ("INVOICE", f"/invoices/{inv['id']}/pdf"), ("RELEASE", f"/release-forms/{rf['id']}/pdf")]:
    r = requests.get(f"{BASE}{path}", headers=H, timeout=90)
    fn = f"/tmp/{kind}.pdf"
    open(fn, "wb").write(r.content)
    txt = extract_text(fn)
    print("=" * 30, kind, r.status_code, len(r.content), "bytes")
    print(txt[:1800])
