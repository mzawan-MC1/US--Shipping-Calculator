# Fakher Alam Used Cars Shipping — System Foundation

> **Mobile-First Shipping Quotation & Lead Management Platform**  
> Direct USA vehicle auction & port logistics to the United Arab Emirates (Sharjah / Dubai).  
> **Staging Preview URL**: [https://shippingcal.mc1services.com](https://shippingcal.mc1services.com)

---

## 1. Product Purpose

**Fakher Alam Used Cars Shipping** provides an end-to-end car shipping quotation and lead-generation portal for individual buyers, car dealers, and auction bidders shipping vehicles from the United States to the UAE.

### Core Value Proposition:
- **Instant Quotation Estimator**: Transparent breakdown of ocean freight, vehicle surcharges, customs clearance, customs duty (5%), and UAE VAT.
- **Direct WhatsApp Lead Conversion**: Streamlined transition from price quotation to dedicated WhatsApp shipping coordinator.
- **Multi-Route & Multi-Port Foundation**: Initial focus on 5 US departure hubs (Newark, Savannah, Houston, Los Angeles, Baltimore) to UAE ports (Khorfakkan, Jebel Ali), architected for expansion to additional origin and destination countries.
- **Bilingual & RTL Native**: First-class English and Arabic support with automatic direction switching (`ltr` and `rtl`).
- **Staff Operations Portal**: Back-office shell for managing leads, customer records, tariffs, routes, and staff permissions.

---

## 2. Technology Stack

- **Frontend Framework**: [React 18](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling & Tokens**: [Tailwind CSS](https://tailwindcss.com/) with custom brand palettes and logical RTL utilities
- **Routing**: [React Router DOM v6](https://reactrouter.com/) (Client-side SPA with route-level code splitting)
- **Validation**: [Zod](https://zod.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Storage, Edge Functions)
- **Testing**: [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/)

---

## 3. Local Installation & Setup

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+` or `v11+`

### Installation
```bash
# Clone the repository
git clone https://github.com/mzawan-MC1/US--Shipping-Calculator.git
cd US--Shipping-Calculator

# Install dependencies (Single lockfile)
npm install
```

### Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Public Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public browser anon key (safe for client) | `your-anon-key` |
| `VITE_APP_MODE` | Application runtime mode (`demo` or `production`) | `demo` |
| `VITE_WHATSAPP_NUMBER` | WhatsApp Business E.164 number | `971521234567` |
| `VITE_COMPANY_PHONE` | Customer service telephone | `+971 52 123 4567` |
| `VITE_COMPANY_EMAIL` | Official inquiries email | `info@fakheralamshipping.com` |
| `VITE_COMPANY_ADDRESS` | Physical headquarters address | `Industrial Area 2, Sharjah, UAE` |

> ⚠️ **CRITICAL SECURITY RULE**: Never put the Supabase `service_role` key into `.env.local` or client code. Frontend bundles only consume public `VITE_` variables.

---

## 4. Development & Build Commands

```bash
# Start local development server (port 3000)
npm run dev

# Run TypeScript type verification without emitting files
npm run type-check

# Run ESLint validation
npm run lint

# Format codebase with Prettier
npm run format

# Run automated tests via Vitest
npm run test

# Compile production bundle (generates dist/ with source maps disabled)
npm run build
```

---

## 5. Production Build & SiteGround Deployment

### Staging Environment Details
- **Target URL**: `https://shippingcal.mc1services.com`
- **Infrastructure**: SiteGround Shared Hosting (Apache)
- **SSL / DNS**: Active via Let’s Encrypt. Do not modify DNS or SSL.
- **Deployment Folder**: SiteGround `shippingcal.mc1services.com` document root (`public_html` for this subdomain).

### Deployment Procedure
1. Build the production assets:
   ```bash
   npm run build
   ```
2. Confirm the build output in `dist/`. Source maps are disabled by default.
3. Open the SiteGround Site Tools or File Manager for `shippingcal.mc1services.com`.
4. Upload the **contents inside `dist/`** (including the hidden `dist/.htaccess` file), NOT the outer `dist` folder.
5. All assets (`index.html`, `.htaccess`, and `assets/`) must reside directly in the subdomain document root.

### SPA Rewrite Configuration (`.htaccess`)
Because this is a Single Page Application with client-side routing, direct navigation or browser refreshes on deep routes (e.g. `/calculator`, `/results`, `/admin`, `/contact`) require Apache rewrite rules.

The application includes `public/.htaccess` which Vite copies directly to `dist/.htaccess`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 6. Critical Architectural Rules

1. **Authoritative Pricing Engine**:
   - Financial calculations, ocean freight base rates, inland towing rules, customs duty (5%), and VAT are **never** calculated authoritatively inside React components.
   - The production pricing engine executes via PostgreSQL functions and Supabase RPC (`calculate_shipping_quote_v1`).
   - Binary floating-point arithmetic is strictly avoided for authoritative balance calculations.
2. **Immutable Quotation Snapshots**:
   - Every confirmed quotation stores an immutable snapshot of all tariffs, exchange rates, and rules at the moment of calculation.
3. **Authentication vs. Authorization**:
   - Authentication uses Supabase Auth.
   - Authorization is enforced by PostgreSQL Row-Level Security (RLS) policies. Client-side navigation hiding is a UX convenience, not security.
4. **Supabase Migration Policy**:
   - All future database tables, functions, indexes, and policies must be created via Git-tracked migration files in `supabase/migrations/`.
   - Never alter the production database schema manually via the dashboard without a tracked migration file.
5. **Centralized Unverified Content Policy**:
   - All marketing claims, ratings, telephone numbers, and business hours are maintained in `src/config/unverifiedContent.ts` and require formal client verification before production launch.

---

## 7. Current Phase Status & Deferred Items

### Completed in Phase 1.1:
- [x] Refined visual identity based on customer reference with lightweight SVG cargo vessel & car graphic.
- [x] Fixed hero country labels (removed duplicate `USA US` / `UAE AE` fallback text).
- [x] Fixed 768px tablet admin layout (collapsed sidebar below `lg`, full-width content, responsive KPI grid, horizontal table scroll).
- [x] Fixed mobile results page (full text wrapping on long towing locations, responsive details card, readable totals).
- [x] Fixed calculator sticky bottom action with mobile safe-area insets (`env(safe-area-inset-bottom)`).
- [x] Restored WhatsApp-only focus on Contact page (removed general enquiry form).
- [x] Centralized all provisional marketing/contact data into `src/config/unverifiedContent.ts`.
- [x] Updated hosting documentation to SiteGround shared hosting (`shippingcal.mc1services.com`).
- [x] Route-level code splitting & disabled production source maps.
- [x] Dev-only gating for `/design-system` (inaccessible in production).
- [x] Deployment ZIP package created (`shippingcal-siteground-preview.zip`).

### Deliberately Deferred to Future Phases:
- Live Supabase PostgreSQL database tables and migrations.
- Live Supabase Auth session enforcement and staff user creation.
- Supabase Storage bucket configuration for vehicle documents.
- Official company vector logo (neutral SVG placeholder used).
- Playwright end-to-end browser journeys.
- Android Capacitor packaging.
