# WETAZZ OS — Product Requirements

## Problem
Build a complete workshop OS for Wetazz Paint Panel & Mechanical (Australia): public site, CRM, vehicles, bookings, jobs kanban, quotes, invoices with deposits/payments, customer portal, AI photo estimating, unified inbox, reviews, staff, analytics.

## Users
- OWNER, ADMIN, SERVICE_ADVISOR, TECHNICIAN, STAFF (staff OS)
- CUSTOMER (portal)

## Implemented (MVP · 2026-02)
- FastAPI + MongoDB backend with JWT auth, role guards
- Public site: Home, Services, About, Contact, Shop, Book Now, Get AI Quote, Login, Signup
- Customer Portal: Vehicles, Bookings, Jobs, Quotes (approve/deposit), Invoices (pay)
- Staff OS: Dashboard (KPIs), Kanban jobs (drag-drop), Customers, Vehicles, Bookings, Quotes, Invoices, Inbox, Reviews, Staff, WETAZZ AI assistant
- Claude Sonnet 5 vision-based photo damage estimator (Emergent Universal Key)
- Claude Sonnet 5 workshop assistant with job context
- Stripe Flow A (claimable sandbox) — deposits + invoice payments in AUD
- Labour timer, GST calc (10% AU), job numbering, quote/invoice numbering
- Registration lookup / VIN decoder stubbed as "NOT CONFIGURED"
- Seed owner + technician on first boot

## Backlog (P1)
- Email/SMS providers (Resend, Twilio)
- Availability calendar drag/drop
- Parts DB + supplier catalog
- Xero/MYOB sync
- Real e-commerce checkout for merch
