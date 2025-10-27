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


