# WETAZZ OS — Product Requirements & Status

Automotive workshop operating system for **Wetazz Paint Panel & Mechanical** (Wellington NSW 2820, Australia).
Public website + CRM + customer portal + internal OS (bookings, jobs, quotes, invoices, payments, AI estimating, branded documents).

Stack: React (frontend) · FastAPI (backend) · MongoDB · Tailwind/shadcn · Stripe (test) · Emergent LLM key (Claude Sonnet 5 vision) · reportlab (PDF).

## Core principle
Real relational data only — NO mock/placeholder business data. Where an integration is
not wired, show "Not Configured". The system ships EMPTY (all counters at zero); only
staff logins + settings + the Wellington location are seeded.

## Implemented (June 2026 — current session)
- **Empty-state system**: all business collections cleared; only owner+tech users, business settings and Wellington location remain. Counters/dashboards start at zero.
- **Consistent branding**: WETAZZ logo (real transparent PNG) used across app headers and every document (`/wetazz-logo-web.png` for web, print-optimized copy for PDFs).
- **Configurable Locations** (`/api/locations`, OS Settings): Wellington NSW 2820 seeded as primary; `location_id` stored on customers, bookings, quotes, invoices, release forms. Owner/Admin can add/set-primary/deactivate. 404 on unknown id.
- **Editable Business Settings + T&Cs** (`/api/settings`, `/os/settings`): business identity + editable Australian paint/panel/mechanical Terms for quotes, invoices, release forms. `/api/business` (public) now reads settings; public footer reflects them.
- **AI Estimate upgrade** (`/quote`, `POST /api/ai/photo-estimate`): requires full name, contact number, rego, make, model, year, details + up to 12 photos (previews + remove + validation). Real Claude vision analysis; result clearly labelled "PRELIMINARY AI ESTIMATE — NOT CONFIRMED WORKSHOP PRICING". Persists estimate and auto-creates a CRM lead + customer. Saved estimates listable at `/api/ai/estimates`.
- **Branded PDF documents** (reportlab, `docgen.py`) with Generate PDF / Print for:
  - **Quotes** — `GET /api/quotes/{id}/pdf`
  - **Invoices (TAX INVOICE)** — `GET /api/invoices/{id}/pdf`
  - **Vehicle Release Forms** — new entity + `/os/release-forms`, `GET /api/release-forms/{id}/pdf`, sign flow.
  All share one layout: logo header, workshop/customer/vehicle blocks, line items, GST (10%) totals, editable T&Cs; release form adds authorisation + signature/date areas.

Testing: iteration_2.json — 100% backend (43/43 pytest) + 100% frontend flows. Post-test fixes: business/footer from settings, 404 guards on location/release-sign PATCH.

## Backlog / Roadmap
- **P1** Resend email integration (sender `Office@wetazz.com.au`) for quotes/invoices/job updates — DB triggers exist, SDK pending (use integration_expert; managed Resend).
- **P1** Twilio SMS integration ("SMS on ready") — architecture built, SDK pending.
- **P1** Merch checkout (Stripe cart on Shop, shipping/pickup).
- **P2** Document Vault → Emergent Object Storage (currently MongoDB base64).
- **P2** ABN field populated for tax-invoice compliance (editable in Settings, currently blank).
- **P2** Rate limiting on public AI estimate endpoint (writes customers/leads + consumes LLM credits).
- **P2** Phone/telephony, Xero/MYOB, AI inbox drafting, Rego/VIN lookup.

## Key files
- Backend: `/app/backend/server.py`, `/app/backend/docgen.py`, `/app/backend/tests/`
- Frontend: `src/pages/public/GetQuote.jsx`, `src/pages/os/{OSSettings,OSReleaseForms,OSQuotes,OSInvoices}.jsx`, `src/pages/os/OSLayout.jsx`, `src/lib/api.js` (`openDoc`)
