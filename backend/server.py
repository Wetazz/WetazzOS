"""WETAZZ OS backend — FastAPI + MongoDB.

Modules: auth, customers, vehicles, bookings, jobs, quotes, invoices,
communications, reviews, staff, AI (Claude Sonnet 5 vision + text), Stripe.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, logging, base64, asyncio, jwt, bcrypt, stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
stripe.api_key = STRIPE_SECRET_KEY

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="WETAZZ OS")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("wetazz")


# ============================================================
# HELPERS
# ============================================================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def uid() -> str:
    return str(uuid.uuid4())


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {"uid": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def current_user(cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not cred:
        raise HTTPException(401, "Not authenticated")
    try:
        data = jwt.decode(cred.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": data["uid"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_roles(*roles):
    async def _dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return _dep


ROLES = ["OWNER", "ADMIN", "SERVICE_ADVISOR", "TECHNICIAN", "STAFF", "CUSTOMER"]
STAFF_ROLES = ["OWNER", "ADMIN", "SERVICE_ADVISOR", "TECHNICIAN", "STAFF"]


# ============================================================
# MODELS
# ============================================================
class SignupIn(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = ""
    role: Literal["CUSTOMER"] = "CUSTOMER"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CustomerIn(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    business_name: Optional[str] = ""
    address: Optional[str] = ""
    customer_type: Optional[str] = "PRIVATE"
    preferred_contact: Optional[str] = "SMS"
    notes: Optional[str] = ""


class VehicleIn(BaseModel):
    customer_id: str
    registration: Optional[str] = ""
    registration_state: Optional[str] = ""
    vin: Optional[str] = ""
    make: str
    model: str
    variant: Optional[str] = ""
    year: Optional[int] = None
    colour: Optional[str] = ""
    paint_code: Optional[str] = ""
    fuel: Optional[str] = ""
    transmission: Optional[str] = ""
    odometer: Optional[int] = None
    engine: Optional[str] = ""
    notes: Optional[str] = ""


class BookingIn(BaseModel):
    customer_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    service_type: str
    booking_type: str
    description: Optional[str] = ""
    preferred_date: str  # ISO date
    preferred_time: str  # HH:MM
    contact_method: Optional[str] = "SMS"
    bay_kind: Optional[str] = "GENERAL"  # PAINT | PANEL | MECHANICAL | GENERAL
    # Guest booking fields (used only when no logged in customer)
    guest_first_name: Optional[str] = ""
    guest_last_name: Optional[str] = ""
    guest_email: Optional[str] = ""
    guest_phone: Optional[str] = ""
    guest_rego: Optional[str] = ""
    guest_make: Optional[str] = ""
    guest_model: Optional[str] = ""
    photos: List[str] = []


class JobIn(BaseModel):
    customer_id: str
    vehicle_id: str
    booking_id: Optional[str] = None
    job_type: str
    private_or_insurance: str = "PRIVATE"
    priority: str = "NORMAL"
    assigned_staff_id: Optional[str] = None
    bay: Optional[str] = ""
    notes: Optional[str] = ""


class JobStatusIn(BaseModel):
    status: str


class QuoteLineItem(BaseModel):
    kind: str  # LABOUR | PART | MATERIAL | OTHER
    description: str
    quantity: float = 1.0
    unit_price: float
    total: float


class QuoteIn(BaseModel):
    customer_id: str
    vehicle_id: str
    job_id: Optional[str] = None
    items: List[QuoteLineItem]
    discount: float = 0.0
    deposit_required: float = 0.0
    notes: Optional[str] = ""
    expiry: Optional[str] = None


class InvoiceIn(BaseModel):
    customer_id: str
    vehicle_id: Optional[str] = None
    job_id: Optional[str] = None
    quote_id: Optional[str] = None
    items: List[QuoteLineItem]
    discount: float = 0.0
    due_date: Optional[str] = None


class CommsIn(BaseModel):
    customer_id: str
    job_id: Optional[str] = None
    channel: str  # SMS | EMAIL | CHAT | PHONE
    direction: str  # IN | OUT
    body: str


class ReviewRequestIn(BaseModel):
    customer_id: str
    job_id: str


class AiChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    job_id: Optional[str] = None


class AiPhotoIn(BaseModel):
    image_base64: str  # raw base64
    vehicle_make: Optional[str] = ""
    vehicle_model: Optional[str] = ""
    description: Optional[str] = ""


class CheckoutIn(BaseModel):
    kind: str  # DEPOSIT | INVOICE
    reference_id: str  # quote_id or invoice_id
    amount: float
    origin_url: str


# ============================================================
# AUTH
# ============================================================
@api.post("/auth/signup")
async def signup(data: SignupIn):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = uid()
    doc = {
        "id": user_id, "email": data.email.lower(), "password": hash_pw(data.password),
        "first_name": data.first_name, "last_name": data.last_name,
        "phone": data.phone, "role": "CUSTOMER", "created_at": now_iso(), "active": True,
    }
    await db.users.insert_one(doc)
    # Auto-create customer record
    cust = {
        "id": uid(), "user_id": user_id, "first_name": data.first_name, "last_name": data.last_name,
        "email": data.email.lower(), "phone": data.phone, "business_name": "", "address": "",
        "customer_type": "PRIVATE", "preferred_contact": "EMAIL", "notes": "",
        "status": "ACTIVE", "created_at": now_iso(), "last_contact": now_iso(),
    }
    await db.customers.insert_one(cust)
    doc.pop("_id", None); cust.pop("_id", None)
    token = make_token(user_id, "CUSTOMER")
    return {"token": token, "user": {k: v for k, v in doc.items() if k != "password"}, "customer_id": cust["id"]}


@api.post("/auth/login")
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_pw(data.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"], user["role"])
    user.pop("password", None); user.pop("_id", None)
    return {"token": token, "user": user}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# ============================================================
# CUSTOMERS
# ============================================================
@api.post("/customers")
async def create_customer(data: CustomerIn, user=Depends(require_roles(*STAFF_ROLES))):
    doc = data.model_dump()
    doc.update({"id": uid(), "status": "ACTIVE", "created_at": now_iso(), "last_contact": now_iso()})
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/customers")
async def list_customers(q: str = "", user=Depends(require_roles(*STAFF_ROLES))):
    filt = {}
    if q:
        filt = {"$or": [
            {"first_name": {"$regex": q, "$options": "i"}},
            {"last_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]}
    rows = await db.customers.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api.get("/customers/{cid}")
async def get_customer(cid: str, user=Depends(require_roles(*STAFF_ROLES))):
    c = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Not found")
    c["vehicles"] = await db.vehicles.find({"customer_id": cid}, {"_id": 0}).to_list(200)
    c["jobs"] = await db.jobs.find({"customer_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    c["quotes"] = await db.quotes.find({"customer_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    c["invoices"] = await db.invoices.find({"customer_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return c


# ============================================================
# VEHICLES
# ============================================================
@api.post("/vehicles")
async def create_vehicle(data: VehicleIn, user=Depends(current_user)):
    doc = data.model_dump()
    # Customers can only add to their own record
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust or cust["id"] != data.customer_id:
            raise HTTPException(403, "Forbidden")
    doc.update({"id": uid(), "verification": "UNVERIFIED", "source": "MANUAL", "created_at": now_iso()})
    await db.vehicles.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/vehicles")
async def list_vehicles(q: str = "", customer_id: str = "", user=Depends(current_user)):
    filt = {}
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust:
            return []
        filt["customer_id"] = cust["id"]
    elif customer_id:
        filt["customer_id"] = customer_id
    if q:
        filt["$or"] = [
            {"registration": {"$regex": q, "$options": "i"}},
            {"vin": {"$regex": q, "$options": "i"}},
            {"make": {"$regex": q, "$options": "i"}},
            {"model": {"$regex": q, "$options": "i"}},
        ]
    return await db.vehicles.find(filt, {"_id": 0}).to_list(500)


@api.get("/vehicles/lookup")
async def rego_lookup(rego: str, state: str = "", user=Depends(require_roles(*STAFF_ROLES))):
    return {"configured": False, "message": "REGISTRATION LOOKUP NOT CONFIGURED", "rego": rego, "state": state}


@api.get("/vehicles/vin/{vin}")
async def vin_lookup(vin: str, user=Depends(require_roles(*STAFF_ROLES))):
    return {"configured": False, "message": "VIN DECODER NOT CONFIGURED", "vin": vin}


@api.get("/vehicles/{vid}")
async def get_vehicle(vid: str, user=Depends(current_user)):
    v = await db.vehicles.find_one({"id": vid}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Not found")
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust or cust["id"] != v["customer_id"]:
            raise HTTPException(403, "Forbidden")
    v["jobs"] = await db.jobs.find({"vehicle_id": vid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    v["quotes"] = await db.quotes.find({"vehicle_id": vid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    v["bookings"] = await db.bookings.find({"vehicle_id": vid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return v


# ============================================================
# GLOBAL SEARCH
# ============================================================
@api.get("/search")
async def global_search(q: str, user=Depends(require_roles(*STAFF_ROLES))):
    rx = {"$regex": q, "$options": "i"}
    customers = await db.customers.find({"$or": [{"first_name": rx}, {"last_name": rx}, {"email": rx}, {"phone": rx}]}, {"_id": 0}).limit(10).to_list(10)
    vehicles = await db.vehicles.find({"$or": [{"registration": rx}, {"vin": rx}, {"make": rx}, {"model": rx}]}, {"_id": 0}).limit(10).to_list(10)
    jobs = await db.jobs.find({"$or": [{"job_number": rx}, {"notes": rx}]}, {"_id": 0}).limit(10).to_list(10)
    return {"customers": customers, "vehicles": vehicles, "jobs": jobs}


# ============================================================
# BOOKINGS
# ============================================================
@api.post("/bookings")
async def create_booking(data: BookingIn, cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    # Double-book guard: capacity = active bays for that kind (fallback 1)
    bay_kind = data.bay_kind or "GENERAL"
    bay_count = max(await db.bays.count_documents({"active": True, "kind": bay_kind}), 1)
    same_slot = await db.bookings.count_documents({
        "preferred_date": data.preferred_date,
        "preferred_time": data.preferred_time,
        "bay_kind": bay_kind,
        "status": {"$nin": ["CANCELLED", "REJECTED"]},
    })
    if same_slot >= bay_count:
        raise HTTPException(409, f"That {bay_kind.lower()} slot is fully booked. Please choose another time.")
    customer_id = data.customer_id
    vehicle_id = data.vehicle_id
    # Handle guest booking
    if not customer_id:
        if not (data.guest_first_name and data.guest_last_name and (data.guest_email or data.guest_phone)):
            raise HTTPException(400, "Guest name and email/phone required")
        cust_doc = {
            "id": uid(), "first_name": data.guest_first_name, "last_name": data.guest_last_name,
            "email": (data.guest_email or "").lower(), "phone": data.guest_phone or "",
            "business_name": "", "address": "", "customer_type": "PRIVATE",
            "preferred_contact": data.contact_method, "notes": "Created via public booking",
            "status": "LEAD", "created_at": now_iso(), "last_contact": now_iso(),
        }
        await db.customers.insert_one(cust_doc)
        customer_id = cust_doc["id"]
        # Also create lead
        await db.leads.insert_one({
            "id": uid(), "customer_id": customer_id, "source": "WEBSITE", "stage": "BOOKED",
            "enquiry": data.description, "created_at": now_iso(),
        })
    if not vehicle_id and (data.guest_make or data.guest_rego):
        veh_doc = {
            "id": uid(), "customer_id": customer_id, "registration": data.guest_rego or "",
            "registration_state": "", "vin": "", "make": data.guest_make or "Unknown",
            "model": data.guest_model or "", "variant": "", "year": None, "colour": "",
            "verification": "UNVERIFIED", "source": "MANUAL", "created_at": now_iso(),
        }
        await db.vehicles.insert_one(veh_doc)
        vehicle_id = veh_doc["id"]

    doc = {
        "id": uid(), "customer_id": customer_id, "vehicle_id": vehicle_id,
        "service_type": data.service_type, "booking_type": data.booking_type,
        "description": data.description, "preferred_date": data.preferred_date,
        "preferred_time": data.preferred_time, "contact_method": data.contact_method,
        "bay_kind": data.bay_kind or "GENERAL",
        "photos": data.photos, "status": "REQUESTED", "created_at": now_iso(),
    }
    await db.bookings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/bookings")
async def list_bookings(user=Depends(current_user)):
    filt = {}
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust:
            return []
        filt["customer_id"] = cust["id"]
    rows = await db.bookings.find(filt, {"_id": 0}).sort("preferred_date", 1).to_list(500)
    # Enrich
    for b in rows:
        cust = await db.customers.find_one({"id": b["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        b["customer"] = cust
    return rows


@api.patch("/bookings/{bid}")
async def update_booking(bid: str, patch: dict, user=Depends(require_roles(*STAFF_ROLES))):
    await db.bookings.update_one({"id": bid}, {"$set": patch})
    return {"ok": True}


# ============================================================
# JOBS
# ============================================================
JOB_STATUSES = [
    "ENQUIRY", "BOOKED", "WAITING_INSPECTION", "INSPECTION", "ESTIMATE",
    "QUOTE_SENT", "AWAITING_APPROVAL", "DEPOSIT_REQUIRED", "AUTHORISED",
    "SCHEDULED", "IN_PROGRESS", "WAITING_PARTS", "QUALITY_CONTROL",
    "READY_FOR_COLLECTION", "COMPLETED", "CLOSED"
]


async def next_job_number() -> str:
    count = await db.jobs.count_documents({})
    return f"WZ-{1000 + count + 1}"


@api.post("/jobs")
async def create_job(data: JobIn, user=Depends(require_roles(*STAFF_ROLES))):
    doc = data.model_dump()
    doc.update({
        "id": uid(), "job_number": await next_job_number(),
        "status": "BOOKED", "labour_seconds": 0, "labour_rate": 135.0,
        "photos": [], "documents": [], "created_at": now_iso(),
    })
    await db.jobs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/jobs")
async def list_jobs(status: str = "", user=Depends(current_user)):
    filt = {}
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust:
            return []
        filt["customer_id"] = cust["id"]
    elif user["role"] == "TECHNICIAN":
        filt["assigned_staff_id"] = user["id"]
    if status:
        filt["status"] = status
    rows = await db.jobs.find(filt, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for j in rows:
        j["customer"] = await db.customers.find_one({"id": j["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        j["vehicle"] = await db.vehicles.find_one({"id": j["vehicle_id"]}, {"_id": 0, "make": 1, "model": 1, "registration": 1, "year": 1})
    return rows


@api.get("/jobs/{jid}")
async def get_job(jid: str, user=Depends(current_user)):
    j = await db.jobs.find_one({"id": jid}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Not found")
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust or cust["id"] != j["customer_id"]:
            raise HTTPException(403, "Forbidden")
    j["customer"] = await db.customers.find_one({"id": j["customer_id"]}, {"_id": 0})
    j["vehicle"] = await db.vehicles.find_one({"id": j["vehicle_id"]}, {"_id": 0})
    j["quotes"] = await db.quotes.find({"job_id": jid}, {"_id": 0}).to_list(20)
    j["invoices"] = await db.invoices.find({"job_id": jid}, {"_id": 0}).to_list(20)
    j["communications"] = await db.communications.find({"job_id": jid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return j


@api.patch("/jobs/{jid}/status")
async def update_job_status(jid: str, data: JobStatusIn, user=Depends(require_roles(*STAFF_ROLES))):
    if data.status not in JOB_STATUSES:
        raise HTTPException(400, "Invalid status")
    await db.jobs.update_one({"id": jid}, {"$set": {"status": data.status, "updated_at": now_iso()}})
    return {"ok": True}


@api.post("/jobs/{jid}/labour/start")
async def labour_start(jid: str, user=Depends(require_roles(*STAFF_ROLES))):
    await db.labour_entries.insert_one({"id": uid(), "job_id": jid, "user_id": user["id"], "start": now_iso(), "end": None})
    return {"ok": True}


@api.post("/jobs/{jid}/labour/stop")
async def labour_stop(jid: str, user=Depends(require_roles(*STAFF_ROLES))):
    entry = await db.labour_entries.find_one({"job_id": jid, "user_id": user["id"], "end": None})
    if not entry:
        raise HTTPException(400, "No active timer")
    end = datetime.now(timezone.utc)
    start = datetime.fromisoformat(entry["start"])
    seconds = int((end - start).total_seconds())
    await db.labour_entries.update_one({"id": entry["id"]}, {"$set": {"end": end.isoformat(), "seconds": seconds}})
    await db.jobs.update_one({"id": jid}, {"$inc": {"labour_seconds": seconds}})
    return {"ok": True, "seconds": seconds}


# ============================================================
# QUOTES
# ============================================================
async def next_quote_number() -> str:
    c = await db.quotes.count_documents({})
    return f"Q-{2000 + c + 1}"


@api.post("/quotes")
async def create_quote(data: QuoteIn, user=Depends(require_roles(*STAFF_ROLES))):
    subtotal = sum(i.total for i in data.items) - data.discount
    gst = round(subtotal * 0.10, 2)
    total = round(subtotal + gst, 2)
    doc = {
        "id": uid(), "quote_number": await next_quote_number(),
        "customer_id": data.customer_id, "vehicle_id": data.vehicle_id, "job_id": data.job_id,
        "items": [i.model_dump() for i in data.items], "discount": data.discount,
        "subtotal": subtotal, "gst": gst, "total": total,
        "deposit_required": data.deposit_required, "notes": data.notes,
        "status": "DRAFT", "version": 1, "expiry": data.expiry,
        "created_at": now_iso(), "created_by": user["id"],
    }
    await db.quotes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/quotes")
async def list_quotes(user=Depends(current_user)):
    filt = {}
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust:
            return []
        filt["customer_id"] = cust["id"]
    rows = await db.quotes.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)
    for q in rows:
        q["customer"] = await db.customers.find_one({"id": q["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        q["vehicle"] = await db.vehicles.find_one({"id": q["vehicle_id"]}, {"_id": 0, "make": 1, "model": 1, "registration": 1})
    return rows


@api.get("/quotes/{qid}")
async def get_quote(qid: str, user=Depends(current_user)):
    q = await db.quotes.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Not found")
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust or cust["id"] != q["customer_id"]:
            raise HTTPException(403, "Forbidden")
    q["customer"] = await db.customers.find_one({"id": q["customer_id"]}, {"_id": 0})
    q["vehicle"] = await db.vehicles.find_one({"id": q["vehicle_id"]}, {"_id": 0})
    return q


@api.patch("/quotes/{qid}/status")
async def update_quote_status(qid: str, body: dict, user=Depends(current_user)):
    new_status = body.get("status")
    valid = ["DRAFT", "INTERNAL_REVIEW", "SENT", "VIEWED", "APPROVED", "REJECTED", "REVISION_REQUESTED", "EXPIRED"]
    if new_status not in valid:
        raise HTTPException(400, "Invalid status")
    q = await db.quotes.find_one({"id": qid})
    if not q:
        raise HTTPException(404, "Not found")
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust or cust["id"] != q["customer_id"]:
            raise HTTPException(403, "Forbidden")
        if new_status not in ["APPROVED", "REJECTED", "REVISION_REQUESTED", "VIEWED"]:
            raise HTTPException(403, "Not allowed for customer")
    await db.quotes.update_one({"id": qid}, {"$set": {"status": new_status, "updated_at": now_iso()}})
    await db.audit_log.insert_one({
        "id": uid(), "user_id": user["id"], "entity": "quote", "entity_id": qid,
        "action": f"status:{new_status}", "at": now_iso(),
    })
    return {"ok": True}


# ============================================================
# INVOICES
# ============================================================
async def next_invoice_number() -> str:
    c = await db.invoices.count_documents({})
    return f"INV-{3000 + c + 1}"


@api.post("/invoices")
async def create_invoice(data: InvoiceIn, user=Depends(require_roles(*STAFF_ROLES))):
    subtotal = sum(i.total for i in data.items) - data.discount
    gst = round(subtotal * 0.10, 2)
    total = round(subtotal + gst, 2)
    doc = {
        "id": uid(), "invoice_number": await next_invoice_number(),
        "customer_id": data.customer_id, "vehicle_id": data.vehicle_id,
        "job_id": data.job_id, "quote_id": data.quote_id,
        "items": [i.model_dump() for i in data.items], "discount": data.discount,
        "subtotal": subtotal, "gst": gst, "total": total,
        "amount_paid": 0.0, "balance": total, "status": "DRAFT",
        "due_date": data.due_date, "created_at": now_iso(),
    }
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/invoices")
async def list_invoices(user=Depends(current_user)):
    filt = {}
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust:
            return []
        filt["customer_id"] = cust["id"]
    rows = await db.invoices.find(filt, {"_id": 0}).sort("created_at", -1).to_list(500)
    for i in rows:
        i["customer"] = await db.customers.find_one({"id": i["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
    return rows


@api.get("/invoices/{iid}")
async def get_invoice(iid: str, user=Depends(current_user)):
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Not found")
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust or cust["id"] != inv["customer_id"]:
            raise HTTPException(403, "Forbidden")
    inv["customer"] = await db.customers.find_one({"id": inv["customer_id"]}, {"_id": 0})
    return inv


# ============================================================
# COMMUNICATIONS (Inbox)
# ============================================================
@api.post("/communications")
async def create_comm(data: CommsIn, user=Depends(require_roles(*STAFF_ROLES))):
    doc = data.model_dump()
    doc.update({"id": uid(), "status": "LOGGED", "created_at": now_iso(), "sent_by": user["id"]})
    await db.communications.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/communications")
async def list_comms(user=Depends(require_roles(*STAFF_ROLES))):
    rows = await db.communications.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for r in rows:
        r["customer"] = await db.customers.find_one({"id": r["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
    return rows


# ============================================================
# REVIEWS
# ============================================================
@api.post("/reviews/request")
async def review_request(data: ReviewRequestIn, user=Depends(require_roles(*STAFF_ROLES))):
    doc = {
        "id": uid(), "customer_id": data.customer_id, "job_id": data.job_id,
        "requested_at": now_iso(), "status": "REQUESTED", "rating": None, "feedback": None,
    }
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/reviews/{rid}/respond")
async def review_respond(rid: str, body: dict, user=Depends(current_user)):
    rating = int(body.get("rating", 0))
    feedback = body.get("feedback", "")
    await db.reviews.update_one({"id": rid}, {"$set": {
        "rating": rating, "feedback": feedback,
        "responded_at": now_iso(), "status": "RESPONDED",
    }})
    if rating <= 2:
        await db.alerts.insert_one({"id": uid(), "kind": "LOW_REVIEW", "review_id": rid, "at": now_iso(), "resolved": False})
    return {"ok": True}


@api.get("/reviews")
async def list_reviews(user=Depends(require_roles(*STAFF_ROLES))):
    rows = await db.reviews.find({}, {"_id": 0}).sort("requested_at", -1).to_list(500)
    for r in rows:
        r["customer"] = await db.customers.find_one({"id": r["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
    return rows


# ============================================================
# STAFF
# ============================================================
class StaffIn(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = ""
    role: str
    hourly_cost: float = 45.0
    selling_rate: float = 135.0
    skills: List[str] = []


@api.post("/staff")
async def create_staff(data: StaffIn, user=Depends(require_roles("OWNER", "ADMIN"))):
    if data.role not in STAFF_ROLES:
        raise HTTPException(400, "Invalid role")
    if await db.users.find_one({"email": data.email.lower()}):
        raise HTTPException(400, "Email exists")
    doc = {
        "id": uid(), "email": data.email.lower(), "password": hash_pw(data.password),
        "first_name": data.first_name, "last_name": data.last_name, "phone": data.phone,
        "role": data.role, "hourly_cost": data.hourly_cost, "selling_rate": data.selling_rate,
        "skills": data.skills, "active": True, "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password", None); doc.pop("_id", None)
    return doc


@api.get("/staff")
async def list_staff(user=Depends(require_roles(*STAFF_ROLES))):
    rows = await db.users.find({"role": {"$in": STAFF_ROLES}}, {"_id": 0, "password": 0}).to_list(500)
    return rows


# ============================================================
# ANALYTICS
# ============================================================
@api.get("/analytics/dashboard")
async def analytics(user=Depends(require_roles(*STAFF_ROLES))):
    open_jobs = await db.jobs.count_documents({"status": {"$nin": ["COMPLETED", "CLOSED"]}})
    ready_jobs = await db.jobs.count_documents({"status": "READY_FOR_COLLECTION"})
    bookings_today = await db.bookings.count_documents({"preferred_date": datetime.now().strftime("%Y-%m-%d")})
    outstanding = 0.0
    async for inv in db.invoices.find({"status": {"$ne": "PAID"}}):
        outstanding += inv.get("balance", 0.0)
    paid_total = 0.0
    async for p in db.payment_transactions.find({"payment_status": "paid"}):
        paid_total += (p.get("amount_cents", 0) / 100.0)
    total_customers = await db.customers.count_documents({})
    total_vehicles = await db.vehicles.count_documents({})
    # Jobs by status buckets for kanban counts
    status_counts = {}
    for s in JOB_STATUSES:
        status_counts[s] = await db.jobs.count_documents({"status": s})
    return {
        "open_jobs": open_jobs, "ready_jobs": ready_jobs, "bookings_today": bookings_today,
        "outstanding_receivable": round(outstanding, 2), "revenue_collected": round(paid_total, 2),
        "customers": total_customers, "vehicles": total_vehicles, "status_counts": status_counts,
    }


# ============================================================
# AI — Photo damage estimating + assistant (Claude Sonnet 5 vision)
# ============================================================
def _llm_chat(system_message: str, session_id: str):
    from emergentintegrations.llm.chat import LlmChat
    return LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message).with_model("anthropic", "claude-sonnet-5")


@api.post("/ai/photo-estimate")
async def ai_photo_estimate(data: AiPhotoIn):
    from emergentintegrations.llm.chat import UserMessage, ImageContent, TextDelta, StreamDone
    chat = _llm_chat(
        "You are WETAZZ AI, a preliminary vehicle damage assessor for an Australian paint, panel and mechanical workshop. "
        "You look at a customer-supplied photo and return a JSON object with keys: "
        "summary, damaged_components (list), repair_categories (list), preliminary_labour_hours (number), "
        "preliminary_materials_aud (number), preliminary_parts_aud (number), price_low_aud (number), price_high_aud (number), "
        "confidence ('LOW'|'MEDIUM'|'HIGH'), notes. "
        "Australian pricing conventions; labour @ $135 AUD/hour. This is a PRELIMINARY estimate — you must not represent it as final. "
        "Return ONLY the JSON object, no prose.",
        session_id=uid(),
    )
    img = ImageContent(image_base64=data.image_base64)
    prompt = f"Vehicle: {data.vehicle_make} {data.vehicle_model}. Customer notes: {data.description or 'none'}. Analyse the visible damage."
    full = ""
    try:
        async for ev in chat.stream_message(UserMessage(text=prompt, file_contents=[img])):
            if isinstance(ev, TextDelta):
                full += ev.content
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        raise HTTPException(500, f"AI error: {e}")
    # Try parse JSON
    import json, re
    parsed = None
    try:
        m = re.search(r"\{.*\}", full, re.DOTALL)
        if m:
            parsed = json.loads(m.group(0))
    except Exception:
        pass
    return {"raw": full, "estimate": parsed, "error": error, "disclaimer": "PRELIMINARY AI ESTIMATE — SUBJECT TO PHYSICAL INSPECTION"}


@api.post("/ai/assistant")
async def ai_assistant(data: AiChatIn, user=Depends(current_user)):
    from emergentintegrations.llm.chat import UserMessage, TextDelta, StreamDone
    context = ""
    if data.job_id:
        job = await db.jobs.find_one({"id": data.job_id}, {"_id": 0})
        if job:
            cust = await db.customers.find_one({"id": job["customer_id"]}, {"_id": 0})
            veh = await db.vehicles.find_one({"id": job["vehicle_id"]}, {"_id": 0})
            context = f"\n\nJOB CONTEXT — Job {job.get('job_number')} status {job.get('status')} for {cust.get('first_name')} {cust.get('last_name')} on {veh.get('year','')} {veh.get('make','')} {veh.get('model','')} rego {veh.get('registration','')}. Notes: {job.get('notes','')}."
    chat = _llm_chat(
        "You are WETAZZ AI, the internal assistant for Wetazz Paint Panel & Mechanical (Australia). "
        "You help staff draft customer messages and answer workshop questions. Use ONLY the job context provided; do NOT invent job progress, prices, parts arrival or completion dates. "
        "For sensitive actions or firm commitments, tell the staff to confirm with the customer directly." + context,
        session_id=data.session_id or uid(),
    )
    reply = ""
    async for ev in chat.stream_message(UserMessage(text=data.message)):
        if isinstance(ev, TextDelta):
            reply += ev.content
        elif isinstance(ev, StreamDone):
            break
    return {"reply": reply}


# ============================================================
# STRIPE PAYMENTS
# ============================================================
@api.post("/payments/checkout")
async def create_checkout(data: CheckoutIn, user=Depends(current_user)):
    if data.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    # Convert AUD to cents
    amount_cents = int(round(data.amount * 100))
    line_name = f"Wetazz {data.kind.title()} — {data.reference_id[:8]}"
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "aud",
                "product_data": {"name": line_name},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        success_url=f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{data.origin_url}/payment/cancel",
        metadata={"user_id": user["id"], "kind": data.kind, "reference_id": data.reference_id},
    )
    await db.payment_transactions.insert_one({
        "session_id": session.id, "user_id": user["id"],
        "kind": data.kind, "reference_id": data.reference_id,
        "amount_cents": amount_cents, "currency": "aud",
        "status": "initiated", "payment_status": "pending",
        "created_at": now_iso(), "updated_at": now_iso(),
    })
    return {"checkout_url": session.url, "session_id": session.id}


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    rec = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Not found")
    if rec.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "stripe_payment_intent_id": s.payment_intent, "updated_at": now_iso()}},
                )
                rec = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
                await _apply_payment_success(rec)
        except stripe.error.StripeError:
            pass
    return {"session_id": rec["session_id"], "status": rec["status"], "payment_status": rec["payment_status"]}


async def _apply_payment_success(rec):
    if not rec:
        return
    kind = rec.get("kind"); ref = rec.get("reference_id"); amt = rec.get("amount_cents", 0) / 100.0
    if kind == "DEPOSIT" and ref:
        await db.quotes.update_one({"id": ref}, {"$set": {"deposit_paid": amt, "deposit_paid_at": now_iso()}})
    elif kind == "INVOICE" and ref:
        inv = await db.invoices.find_one({"id": ref})
        if inv:
            new_paid = inv.get("amount_paid", 0.0) + amt
            balance = round(inv.get("total", 0.0) - new_paid, 2)
            status_new = "PAID" if balance <= 0.01 else "PARTIALLY_PAID"
            await db.invoices.update_one({"id": ref}, {"$set": {"amount_paid": new_paid, "balance": balance, "status": status_new}})


@api.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(400, "Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"),
                      "stripe_payment_intent_id": obj.get("payment_intent"), "updated_at": now_iso()}},
        )
        rec = await db.payment_transactions.find_one({"session_id": obj["id"]})
        await _apply_payment_success(rec)
    return {"status": "ok"}


# ============================================================
# SEED — Owner + demo data
# ============================================================
@api.post("/seed")
async def seed(force: bool = False):
    if not force and await db.users.count_documents({"role": "OWNER"}) > 0:
        return {"ok": True, "seeded": False}
    owner_id = uid()
    await db.users.insert_one({
        "id": owner_id, "email": "owner@wetazz.com.au", "password": hash_pw("Wetazz2026!"),
        "first_name": "Sam", "last_name": "Wetazz", "phone": "+61400000001",
        "role": "OWNER", "active": True, "created_at": now_iso(),
    })
    tech_id = uid()
    await db.users.insert_one({
        "id": tech_id, "email": "tech@wetazz.com.au", "password": hash_pw("Wetazz2026!"),
        "first_name": "Kai", "last_name": "Turner", "phone": "+61400000002",
        "role": "TECHNICIAN", "hourly_cost": 45.0, "selling_rate": 135.0,
        "skills": ["Paint", "Panel"], "active": True, "created_at": now_iso(),
    })
    return {"ok": True, "seeded": True, "owner_email": "owner@wetazz.com.au", "owner_password": "Wetazz2026!"}


# ============================================================
# PUBLIC BUSINESS INFO
# ============================================================
@api.get("/business")
async def business_info():
    return {
        "name": "Wetazz Paint & Panel Mechanical",
        "tagline": "Paint · Panel · Mechanical",
        "phone": "+61 2 0000 0000",
        "email": "hello@wetazz.com.au",
        "address": "89 Maxwell St, Wellington NSW, Australia",
        "hours": {"Mon-Fri": "8:00 – 17:30", "Sat": "9:00 – 13:00", "Sun": "Closed"},
        "services": [
            {"category": "MECHANICAL", "items": ["Log book servicing", "Brakes", "Suspension", "Tyres", "Batteries", "Diagnostics", "Cooling systems", "Engine repairs", "Mechanical inspections"]},
            {"category": "PANEL", "items": ["Panel repairs", "Dent repairs", "Panel replacement", "Bumper repairs", "Accident repairs", "Smash repairs", "Damage assessment"]},
            {"category": "PAINT", "items": ["Paint work", "Full resprays", "Panel painting", "Colour matching", "Spot repairs", "Touch-ups", "Clear coat repairs"]},
            {"category": "ACCESSORIES", "items": ["4WD accessory fitting", "Spare parts"]},
        ],
    }


# ============================================================
# PARTS & SUPPLIERS
# ============================================================
class SupplierIn(BaseModel):
    name: str
    contact: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    notes: Optional[str] = ""


class PartIn(BaseModel):
    part_number: str
    oem_number: Optional[str] = ""
    description: str
    manufacturer: Optional[str] = ""
    supplier_id: Optional[str] = None
    cost: float = 0.0
    selling_price: float = 0.0
    gst_inclusive: bool = False
    stock: float = 0.0
    minimum_stock: float = 0.0
    location: Optional[str] = ""
    fitment: Optional[str] = ""


@api.post("/suppliers")
async def create_supplier(data: SupplierIn, user=Depends(require_roles(*STAFF_ROLES))):
    doc = data.model_dump(); doc.update({"id": uid(), "created_at": now_iso()})
    await db.suppliers.insert_one(doc); doc.pop("_id", None); return doc


@api.get("/suppliers")
async def list_suppliers(user=Depends(require_roles(*STAFF_ROLES))):
    return await db.suppliers.find({}, {"_id": 0}).sort("name", 1).to_list(500)


@api.post("/parts")
async def create_part(data: PartIn, user=Depends(require_roles(*STAFF_ROLES))):
    doc = data.model_dump(); doc.update({"id": uid(), "created_at": now_iso()})
    await db.parts.insert_one(doc); doc.pop("_id", None); return doc


@api.get("/parts")
async def list_parts(q: str = "", user=Depends(require_roles(*STAFF_ROLES))):
    filt = {}
    if q:
        rx = {"$regex": q, "$options": "i"}
        filt = {"$or": [{"part_number": rx}, {"oem_number": rx}, {"description": rx}, {"manufacturer": rx}]}
    rows = await db.parts.find(filt, {"_id": 0}).sort("part_number", 1).to_list(1000)
    sup_map = {s["id"]: s for s in await db.suppliers.find({}, {"_id": 0}).to_list(500)}
    for p in rows:
        p["supplier"] = sup_map.get(p.get("supplier_id"))
    return rows


@api.post("/parts/{pid}/adjust-stock")
async def adjust_stock(pid: str, body: dict, user=Depends(require_roles(*STAFF_ROLES))):
    delta = float(body.get("delta", 0)); reason = body.get("reason", "manual")
    await db.parts.update_one({"id": pid}, {"$inc": {"stock": delta}})
    await db.stock_adjustments.insert_one({"id": uid(), "part_id": pid, "delta": delta, "reason": reason, "at": now_iso(), "user_id": user["id"]})
    return {"ok": True}


# ============================================================
# BAYS + AVAILABILITY
# ============================================================
class BayIn(BaseModel):
    name: str
    kind: str = "GENERAL"  # PAINT | PANEL | MECHANICAL | GENERAL
    active: bool = True


class BlockIn(BaseModel):
    bay_id: Optional[str] = None
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str
    reason: Optional[str] = ""


@api.post("/bays")
async def create_bay(data: BayIn, user=Depends(require_roles("OWNER", "ADMIN"))):
    doc = data.model_dump(); doc.update({"id": uid(), "created_at": now_iso()})
    await db.bays.insert_one(doc); doc.pop("_id", None); return doc


@api.get("/bays")
async def list_bays(user=Depends(require_roles(*STAFF_ROLES))):
    return await db.bays.find({"active": True}, {"_id": 0}).to_list(100)


@api.post("/blocks")
async def create_block(data: BlockIn, user=Depends(require_roles(*STAFF_ROLES))):
    doc = data.model_dump(); doc.update({"id": uid(), "created_at": now_iso()})
    await db.calendar_blocks.insert_one(doc); doc.pop("_id", None); return doc


@api.get("/calendar")
async def calendar_range(start: str, end: str, user=Depends(require_roles(*STAFF_ROLES))):
    bookings = await db.bookings.find({"preferred_date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(1000)
    for b in bookings:
        b["customer"] = await db.customers.find_one({"id": b["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
    blocks = await db.calendar_blocks.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(500)
    return {"bookings": bookings, "blocks": blocks}


@api.get("/calendar/availability")
async def availability(date: str, user=Depends(require_roles(*STAFF_ROLES))):
    """Return slot occupancy for a given date. Slots are 30-min from 08:00-17:30."""
    bays = await db.bays.find({"active": True}, {"_id": 0}).to_list(100)
    if not bays:
        bays = [{"id": "_default", "name": "Bay 1"}, {"id": "_default2", "name": "Bay 2"}]
    slots = []
    hours = list(range(8, 18))
    for h in hours:
        for m in (0, 30):
            slots.append(f"{h:02d}:{m:02d}")
    booked = await db.bookings.find({"preferred_date": date}, {"_id": 0, "preferred_time": 1}).to_list(200)
    booked_times = [b["preferred_time"][:5] for b in booked]
    return {"date": date, "bays": bays, "slots": slots, "booked": booked_times}


# ============================================================
# ACCOUNTING (built-in, not external)
# ============================================================
class ExpenseIn(BaseModel):
    category: str
    description: str
    amount: float
    supplier_id: Optional[str] = None
    date: str


@api.post("/accounting/expenses")
async def create_expense(data: ExpenseIn, user=Depends(require_roles("OWNER", "ADMIN"))):
    doc = data.model_dump(); doc.update({"id": uid(), "created_at": now_iso(), "created_by": user["id"]})
    await db.expenses.insert_one(doc); doc.pop("_id", None)
    # Journal entry
    await db.journal.insert_one({
        "id": uid(), "kind": "EXPENSE", "ref_id": doc["id"], "date": data.date,
        "debit_account": data.category, "credit_account": "CASH",
        "amount": data.amount, "created_at": now_iso(),
    })
    return doc


@api.get("/accounting/expenses")
async def list_expenses(user=Depends(require_roles("OWNER", "ADMIN"))):
    return await db.expenses.find({}, {"_id": 0}).sort("date", -1).to_list(500)


@api.get("/accounting/summary")
async def accounting_summary(user=Depends(require_roles("OWNER", "ADMIN"))):
    # Revenue from paid invoice-linked payments + invoice paid amounts
    revenue = 0.0; gst_collected = 0.0
    async for inv in db.invoices.find({}):
        revenue += inv.get("amount_paid", 0.0)
    async for p in db.payment_transactions.find({"payment_status": "paid", "kind": "DEPOSIT"}):
        revenue += p.get("amount_cents", 0) / 100.0
    # GST from paid invoices proportionally
    async for inv in db.invoices.find({"status": {"$in": ["PAID", "PARTIALLY_PAID"]}}):
        gst_collected += inv.get("gst", 0.0) * (inv.get("amount_paid", 0.0) / max(inv.get("total", 1.0), 0.01))

    expenses_total = 0.0; expenses_by_cat = {}
    async for e in db.expenses.find({}):
        expenses_total += e.get("amount", 0.0)
        expenses_by_cat[e["category"]] = expenses_by_cat.get(e["category"], 0.0) + e.get("amount", 0.0)

    # AR
    ar = 0.0
    async for inv in db.invoices.find({"status": {"$ne": "PAID"}}):
        ar += inv.get("balance", 0.0)

    # Deposits held (paid deposits linked to non-completed quotes)
    deposits_held = 0.0
    async for p in db.payment_transactions.find({"payment_status": "paid", "kind": "DEPOSIT"}):
        deposits_held += p.get("amount_cents", 0) / 100.0

    gross_profit = revenue - expenses_total
    return {
        "revenue": round(revenue, 2),
        "expenses": round(expenses_total, 2),
        "gross_profit": round(gross_profit, 2),
        "gst_collected": round(gst_collected, 2),
        "accounts_receivable": round(ar, 2),
        "deposits_held": round(deposits_held, 2),
        "expenses_by_category": {k: round(v, 2) for k, v in expenses_by_cat.items()},
    }


@api.get("/accounting/journal")
async def list_journal(user=Depends(require_roles("OWNER", "ADMIN"))):
    return await db.journal.find({}, {"_id": 0}).sort("date", -1).to_list(1000)


class InsuranceIn(BaseModel):
    insurer: str
    claim_number: str
    assessor_name: Optional[str] = ""
    assessor_phone: Optional[str] = ""
    assessor_email: Optional[str] = ""
    excess: float = 0.0
    date_of_loss: Optional[str] = ""
    notes: Optional[str] = ""


@api.patch("/jobs/{jid}/insurance")
async def set_insurance(jid: str, data: InsuranceIn, user=Depends(require_roles(*STAFF_ROLES))):
    await db.jobs.update_one({"id": jid}, {"$set": {"insurance": data.model_dump(), "private_or_insurance": "INSURANCE"}})
    return {"ok": True}


@api.get("/jobs/{jid}/insurance-pack")
async def insurance_pack(jid: str, user=Depends(require_roles(*STAFF_ROLES))):
    j = await db.jobs.find_one({"id": jid}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Not found")
    j["customer"] = await db.customers.find_one({"id": j["customer_id"]}, {"_id": 0})
    j["vehicle"] = await db.vehicles.find_one({"id": j["vehicle_id"]}, {"_id": 0})
    j["quotes"] = await db.quotes.find({"job_id": jid}, {"_id": 0}).to_list(20)
    j["photos_full"] = await db.job_photos.find({"job_id": jid}, {"_id": 0, "image_base64": 0}).to_list(100)
    return j


class PhotoIn(BaseModel):
    image_base64: str
    caption: Optional[str] = ""
    stage: Optional[str] = "DURING"  # BEFORE | DURING | AFTER


@api.post("/jobs/{jid}/photos")
async def upload_job_photo(jid: str, data: PhotoIn, user=Depends(current_user)):
    j = await db.jobs.find_one({"id": jid})
    if not j:
        raise HTTPException(404, "Job not found")
    # Only assigned tech/staff or customer-of-job
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust or cust["id"] != j["customer_id"]:
            raise HTTPException(403, "Forbidden")
    doc = {
        "id": uid(), "job_id": jid, "image_base64": data.image_base64,
        "caption": data.caption, "stage": (data.stage or "DURING").upper(),
        "uploaded_by": user["id"], "uploaded_by_role": user["role"],
        "created_at": now_iso(),
    }
    await db.job_photos.insert_one(doc)
    return {"id": doc["id"], "created_at": doc["created_at"]}


@api.get("/jobs/{jid}/photos")
async def list_job_photos(jid: str, user=Depends(current_user)):
    j = await db.jobs.find_one({"id": jid})
    if not j:
        raise HTTPException(404, "Job not found")
    if user["role"] == "CUSTOMER":
        cust = await db.customers.find_one({"user_id": user["id"]})
        if not cust or cust["id"] != j["customer_id"]:
            raise HTTPException(403, "Forbidden")
    rows = await db.job_photos.find({"job_id": jid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


# ============================================================
# ASSESSOR PUBLIC LINK (signed, no auth)
# ============================================================
@api.post("/jobs/{jid}/assessor-link")
async def create_assessor_link(jid: str, user=Depends(require_roles(*STAFF_ROLES))):
    j = await db.jobs.find_one({"id": jid})
    if not j:
        raise HTTPException(404, "Not found")
    payload = {"jid": jid, "exp": datetime.now(timezone.utc) + timedelta(days=14), "scope": "assessor"}
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return {"url": f"/assessor/{token}", "expires_in_days": 14}


@api.get("/assessor/{token}")
async def assessor_view(token: str):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired link")
    if data.get("scope") != "assessor":
        raise HTTPException(403, "Wrong scope")
    jid = data["jid"]
    j = await db.jobs.find_one({"id": jid}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Not found")
    j["customer"] = await db.customers.find_one({"id": j["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1, "phone": 1, "email": 1})
    j["vehicle"] = await db.vehicles.find_one({"id": j["vehicle_id"]}, {"_id": 0})
    j["quotes"] = await db.quotes.find({"job_id": jid}, {"_id": 0}).to_list(20)
    j["photos"] = await db.job_photos.find({"job_id": jid}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return j


# ============================================================
# REGISTER + CORS
# ============================================================
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Ensure indexes
    await db.users.create_index("email", unique=True)
    await db.customers.create_index("email")
    await db.vehicles.create_index("customer_id")
    await db.jobs.create_index("customer_id")
    await db.jobs.create_index("status")
    log.info("WETAZZ OS started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
