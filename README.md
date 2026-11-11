## FoxesGear.com

Minimal pre-order storefront for Stratford Foxes Basketball Association.

### Tech
- Next.js App Router, TypeScript (strict), Tailwind
- Supabase (Postgres, Auth, Storage)
- Stripe Checkout + Webhooks
- Resend (emails)

### Setup
1. Create `env.example` to `.env.local` and fill values:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
RESEND_API_KEY=
RESEND_FROM="FoxesGear <orders@yourdomain.com>"
```
2. Install deps and run dev server:
```
npm install
npm run dev
```

### Scripts
- `npm run lint` — ESLint
- `npm run format` — Prettier write
- `npm run test` — Playwright

### Development
- Public pages: `src/app` (`/`, `/shop`, `/product/[slug]`, `/cart`, `/checkout`, `/success`)
- Admin pages: `src/app/admin` (`/dashboard`, `/products`, `/orders`, `/reports`)
- API routes: `src/app/api/checkout`, `src/app/api/stripe-webhook`
- Clients: `src/lib/*`
- Types: `src/types`
- Store: `src/store/cart.ts`

### Deploy
Deploy on Vercel. Set environment variables in Vercel project settings.

### Database
Apply schema, RLS, then seed initial data via Supabase SQL editor or CLI:
```
-- schema
-- paste contents of supabase/schema.sql

-- rls policies
-- paste contents of supabase/rls.sql

-- seed data
-- paste contents of supabase/seed.sql
```



### Admin users and seasons

Sign in again after this update so the server can verify your cookie-based session.

- **Owner → Users:** only the protected owner can add users and manage access. **Add user and email invitation** sends a personal setup email automatically. Previously added accounts have **Send invitation**, followed by **Resend invitation**; completed accounts have **Send password reset**. A one-minute resend cooldown prevents duplicate clicks. The table records email-send status and when setup completes. Signup completion emails go to `jasonmacpei@hotmail.com`.
- **Admin → Seasons:** create a basketball season and select the current season for new checkouts. Historical orders remain in their original season.
- **Dashboard / Orders / Reports:** select 2025–2026 or 2026–2027. CSV exports use the same season as the report. Paid-live reports exclude test and refunded orders.
- **Reports → Packing slips / Pickup checklist:** filter by group, collection status or player/customer/order number. Print the visible orders as individual packing slips or a grouped pickup checklist. Mark collected saves the collection time; Undo collection returns the order to awaiting pickup. Collection does not change payment status or sales totals. Times are shown in Atlantic time. Apply the `add_order_pickups` migration before using these reports.

For a new database, the original schema/RLS SQL above is only the legacy baseline. Apply the SQL files in `supabase/migrations/` in filename order afterward. Do not rerun the legacy RLS file on an upgraded database. The November 10 migrations have already been applied to the existing FoxesGear database.

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for findings, verification scope, and remaining follow-ups. `ADMIN_BACKFILL_TOKEN` is retired by the updated backfill endpoint; that endpoint now requires a signed-in admin session and same-origin request.

Authenticated integration QA is opt-in and requires the local email mock:

1. Run `node tests/helpers/email-server.mjs`.
2. Build, then start locally with `RESEND_BASE_URL=http://127.0.0.1:4010 RESEND_API_KEY=local-test-key CRON_SECRET=local-cron-test npm run start`.
3. Run `FOXESGEAR_LIVE_QA=1 FOXESGEAR_EMAIL_MOCK_URL=http://127.0.0.1:4010 npm test -- --workers=1`.

QA uses an ephemeral owner session and disposable Auth accounts, cleaned up afterward. Emails remain in the local mock and no existing orders are changed. Never run authenticated email QA against the production website.

Production needs `RESEND_API_KEY`, `RESEND_FROM`, and a server-only `CRON_SECRET`. The scheduled `/api/cron/signup-emails` job retries queued signup notifications every ten minutes; first delivery is attempted as soon as the user saves their password. `RESEND_BASE_URL` is for local tests and must not be set in production.
