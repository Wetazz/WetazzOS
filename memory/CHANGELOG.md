# WETAZZ OS — Changelog

## June 2026 — Integrations, signatures & shop
- **Owner account** set to real email `aaronsmithard309@gmail.com` (password Wetazz2026!). System remains empty of business data (owner + tech + Wellington location only).
- **Email (Resend, Emergent-managed)**: `auto_log_comm` now performs REAL email delivery for quote-sent, invoice-created, booking and job-status triggers; status reflects true outcome (SENT/FAILED/NOT_CONFIGURED, never faked). Display name "Wetazz Paint Panel & Mechanical"; reply-to Office@wetazz.com.au. Guardrail gate in `email_utils.py`. Verified send returns 202.
- **SMS (Twilio)**: `send_sms` helper + wired into SMS comms. Logged-only until TWILIO_* keys are added (graceful no-op).
- **Digital signature sign-off**: canvas `SignaturePad` + `SignatureModal`. Customers approve & sign quotes in the portal (`POST /api/quotes/{id}/sign`, method PORTAL); staff capture onsite signatures in OS Quotes (method ONSITE). Signature stored on the quote and mirrored to the linked job (status → AUTHORISED). Embedded in BOTH the branded Quote PDF (authorisation block) and the Invoice PDF (looked up via quote_id/job_id). Verified via rendered PDF.
- **Shop checkout (Stripe)**: `/api/shop/products` + `/api/shop/checkout`. Cart with quantities, pickup (free) vs shipping (A$14.99, free over A$150). Server-side pricing/shipping math. Redirects to Stripe hosted checkout (test mode).
- **T&Cs**: added parts-deposit clause (min 30% deposit on parts; may require parts paid in full before order) to quote & invoice default terms (editable in Settings).

Testing: backend curl E2E all green (signed quote/invoice PDFs 200, shop checkout math + https URL, managed email 202). Frontend compiles. Interaction flows to be validated by testing agent (screenshot tool did not reflect in-page state).
