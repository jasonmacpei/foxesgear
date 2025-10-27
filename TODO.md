# FoxesGear – Build TODO

Keep in sync with `foxesgear_project_plan.md`.

Legend: [ ] pending  [x] done  [~] in progress

## Phase 1 – Foundation
- [x] Scaffold Next.js (App Router) + TS strict + Tailwind
- [x] ESLint/Prettier configuration
- [x] Install core libs (Supabase, Stripe, Resend, Zod, Zustand)
- [x] Clients and types (`src/lib/*`, `src/types`)
- [x] Base UI: `Header`/`Footer`
- [x] Public pages: home, shop, product detail, cart, checkout, success
- [x] API: `POST /api/checkout`, `POST /api/stripe-webhook`
- [x] Supabase schema (`supabase/schema.sql`)
- [x] RLS policies (`supabase/rls.sql`)
- [x] Seed initial products/variants (`supabase/seed.sql`)

## Phase 2 – Cart & Checkout
- [x] Local cart store (persisted)
- [x] Stripe Checkout redirect flow
- [x] Webhook persistence to Supabase + email
- [ ] Server-side cart validation before creating Checkout Session
- [ ] Success page: show order summary + pickup instructions
- [ ] Optional e-transfer method (instructions + admin mark-as-paid)

## Phase 3 – Admin & Reporting
- [ ] Supabase Auth: sign-in and admin guard for `/admin/*`
- [ ] Admin Products CRUD (active toggle, sort order)
- [ ] Admin Variants management (sizes, colors, pricing)
- [ ] Product images via Supabase Storage (upload UI)
- [ ] Admin Orders list with filters and details view
- [ ] CSV export endpoints + UI (printer and sales summaries)

## Phase 4 – Final Polish
- [ ] Settings admin (preorder window, pickup info)
- [ ] Preorder banner + gate checkout by window
- [ ] Resend email templates (order confirmation with line items)
- [ ] Shop polish: filters/sorting, grid styles
- [ ] Cart polish: update/remove items, edge cases
- [ ] SEO/branding: title, meta, favicon/logo, theme color
- [ ] Error handling and server-side logging
- [ ] Playwright e2e: cart, checkout, admin auth
- [ ] Deploy to Vercel, set env vars, connect `foxesgear.com`
- [ ] Accessibility + responsive QA pass

## Environment
- [x] `.env.local` created (see `env.example`)
- [x] `STRIPE_WEBHOOK_SECRET` from dashboard endpoint (prod + local listen)
- [x] `RESEND_API_KEY` + `RESEND_FROM`

## Notes / Links
- Plan: `foxesgear_project_plan.md`
- SQL: `supabase/schema.sql`, `supabase/rls.sql`, `supabase/seed.sql`
- Webhook: `/api/stripe-webhook` (events: checkout.session.completed, payment_intent.succeeded/failed, session.expired)

## Quick commands
```
cd foxesgear
npm install
npm run dev
npm run test
```
