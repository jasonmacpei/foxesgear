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

- **Owner → Users:** only the protected owner (Jason’s existing account) can create accounts, generate private password-setup links, grant/revoke admin access, and disable/re-enable accounts. Other admins retain product publishing and store management but cannot manage users. Click Share access beside a person to open an invitation labelled with their name and email. Copy invitation includes instructions; Open email draft addresses it to that person, but you still press Send in your email app. No invitation email is sent automatically.
- **Admin → Seasons:** create a basketball season and select the current season for new checkouts. Historical orders remain in their original season.
- **Dashboard / Orders / Reports:** select 2025–2026 or 2026–2027. CSV exports use the same season as the report. Paid-live reports exclude test and refunded orders.

For a new database, the original schema/RLS SQL above is only the legacy baseline. Apply the SQL files in `supabase/migrations/` in filename order afterward. Do not rerun the legacy RLS file on an upgraded database. The November 10 migrations have already been applied to the existing FoxesGear database.

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for findings, verification scope, and remaining follow-ups. `ADMIN_BACKFILL_TOKEN` is retired by the updated backfill endpoint; that endpoint now requires a signed-in admin session and same-origin request.

Authenticated integration QA is opt-in: start a local production build, then run `FOXESGEAR_LIVE_QA=1 npm test -- tests/admin-security.spec.ts --workers=1`. It uses an ephemeral admin session and a disposable Auth account, cleaned up afterward, without sending emails or changing existing orders.
