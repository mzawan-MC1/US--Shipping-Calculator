# Architecture Decision Records (ADRs)

## Project: Fakher Alam Used Cars Shipping
**Date:** September 2026  
**Role:** Lead Full-Stack & UI/UX Engineer  
**Status:** Approved & Implemented (Phase 1.1)

---

### ADR 001: Frontend Framework & Build Tooling
- **Decision**: Select **React 18** with **Vite** and **TypeScript** (Strict Mode).
- **Context**: The client requires a fast, mobile-first web calculator and lead management platform with future readiness for Progressive Web App (PWA) installation and Capacitor Android bundling.
- **Rationale**:
  - Vite provides sub-second Hot Module Replacement (HMR) and optimized rollup production bundles.
  - Route-level lazy loading (`React.lazy`) splits public pages and admin chunks so public users never load administrative code.
  - Source maps are disabled in production builds to reduce bundle footprint and protect internal code structures.

---

### ADR 002: Backend Architecture & Database Governance
- **Decision**: Standardize on **Supabase** (PostgreSQL, Supabase Auth, Storage, Edge Functions) as the sole backend. Reject custom Node.js/Express production servers.
- **Context**: The system will support customer inquiries, quotation revisions, immutable pricing snapshots, staff RBAC, and media storage.
- **Rationale**:
  - PostgreSQL provides native ACID guarantees, relational integrity, and stored procedures (`PL/pgSQL`) for atomic financial calculations.
  - Avoids maintaining and securing a custom Node.js server runtime on shared hosting.
  - Git-tracked migrations ensure reproducible schema state across local, staging, and production environments.

---

### ADR 003: Hosting on SiteGround Shared Infrastructure
- **Decision**: Static Single-Page Application (SPA) compiled to `dist/` and served via SiteGround shared hosting with Apache `mod_rewrite` at `https://shippingcal.mc1services.com`.
- **Context**: The client's staging infrastructure is SiteGround shared hosting. Subdomain and Let's Encrypt SSL are already active.
- **Rationale**:
  - Static files require zero server maintenance and boast virtually instantaneous time-to-first-byte (TTFB).
  - The `dist/.htaccess` rewrite configuration transparently delegates all client routes (`/calculator`, `/results`, `/admin/*`) to `/index.html`, eliminating 404 refresh errors.
  - Deployment is executed by uploading the contents inside `dist/` directly into the `shippingcal.mc1services.com` document root.

---

### ADR 004: Mobile-First UX & Design Hierarchy
- **Decision**: Build from 360px mobile viewport upwards using a cohesive automotive logistics identity:
  - **Deep Navy** (`#071224` / `#0A192F`): Authoritative brand foundation.
  - **Vibrant Orange** (`#F97316`): Primary calculation actions.
  - **Emerald Green** (`#25D366`): Strictly reserved for WhatsApp contact points.
  - **Elevated White/Slate Cards**: High-contrast, touch-friendly interactive targets (minimum 44-48px).
- **Rationale**: Over 70% of car auction buyers and shipping inquiries originate from mobile devices (WhatsApp referrals and auction floor bidding).

---

### ADR 005: Bilingual LTR/RTL Localization Strategy
- **Decision**: Zero-dependency typed dictionary architecture (`i18n/`) with persistent local direction toggling.
- **Context**: Target market is primarily the UAE (Arabic and English).
- **Rationale**:
  - Avoids bloated third-party runtime bundles while maintaining 100% type coverage for keys.
  - Automatically updates `dir="rtl"` and `lang="ar"` on `<html>`, with Tailwind logical properties (`ps-`, `pe-`, `start-`, `end-`) ensuring zero layout regressions across languages.

---

### ADR 006: Authoritative Database Calculation Engine & RBAC Governance
- **Decision**: All financial quotation computations (ocean freight, towing brackets, surcharges, UAE customs duty 5%, import VAT 5%, and AED currency conversions) must be executed strictly server-side inside PostgreSQL via the `public.calculate_shipping_quote_v1(jsonb)` stored procedure.
- **Rationale**:
  - The client UI is never trusted for pricing or tariff parameters.
  - Generates immutable calculation snapshots (`pricing_snapshot`) stored alongside quotation records.
  - Staff RBAC is enforced via granular permission checks (`has_permission`) and strict Row-Level Security (RLS) policies across all 27 public tables.

---

### ADR 007: Cloudflare Turnstile Abuse Protection Deferral & Production Security Limitation
- **Decision**: Cloudflare Turnstile integration is intentionally deferred for subsequent operational rollout.
- **Security Boundary & Risk Acceptance**:
  - Public anonymous quotation submission (`calculate_shipping_quote_v1`) is accessible to role `anon` to allow unauthenticated web visitors to calculate shipping costs and submit inquiries.
  - **Limitation**: Until Cloudflare Turnstile (or equivalent server-side proof-of-work / IP rate limiting via Supabase Edge Functions or Cloudflare WAF) is deployed, public quotation submission is susceptible to automated script abuse, fake lead generation, or denial-of-service spam.
  - Production deployment of public quotation submission must NOT be considered fully abuse-protected until Turnstile or equivalent anti-bot verification is enforced.

