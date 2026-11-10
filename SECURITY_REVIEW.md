# FoxesGear security and admin review

Reviewed November 10, 2026. This is a focused source, live configuration, and access-control review, not a penetration test or evidence of whether past access occurred.

## Findings

| Priority | Finding | Change |
| --- | --- | --- |
| Critical | Refund API used the service key without authenticating the caller. A known order ID could be used to request a refund. No refund was issued during this review. | Verify Supabase sessions and live admin roles on the server; require same-origin mutations; validate order IDs; use a Stripe refund idempotency key. |
| High | Admin relied on a client component to hide server-rendered order data. An unauthenticated production RSC response included customer, email, and affiliated-player fields. | Check admin access before each admin page loads data and before settings actions execute. |
| High | Sales/printer exports, including the legacy `/api` route, had no authorization. The live sales export returned HTTP 200 without a session. | Protect every export and disable caching of authenticated responses. |
| High | Signed-in database users could insert arbitrary orders/items. Public security-definer helpers were exposed; one had a mutable search path. | Restrict recording orders to server code; put the RLS helper in a private schema with a fixed search path; revoke public trigger execution. Applied and verified in the live database. |
| High | The deployed Next.js version was 16.0.10, behind current security updates. | Update Next.js to 16.4.6, React to 19.3.1, Supabase clients, and compatible dependency patches. Production dependency audit: zero reported vulnerabilities. |
| Moderate | Receipt HTML inserted customer-controlled strings without escaping; CSV values could be spreadsheet formulas. | Escape receipt text and neutralize CSV formulas. |
| Reporting | Reports used recent Stripe account balance transactions rather than season-specific orders. The live database also lacked fields the webhook expected for saved charge/fee details. | Add missing nullable fields and calculate season totals from saved order records. Missing fee/net data remains “Unavailable.” |

Framework guidance: [Next.js security advisories](https://github.com/vercel/next.js/security/advisories). Auth implementation follows [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [token verification](https://supabase.com/docs/reference/javascript/auth-verifyotp).

## Users

`/admin/users` supports creating an account and a private, expiring password-setup link, generating a replacement setup link, granting/revoking admin access, and disabling/re-enabling an account. Links are returned only to the owner and are not emailed automatically. New users choose their own password, with a 12-character minimum in the setup form. Existing users will need to sign in again to establish the server-readable cookie session.

Role changes use a service-only database function that serializes concurrent changes, verifies the acting owner, and refuses any change to the owner account. Disabled users lose admin and database administration permissions immediately; their sign-in is also banned. The sole protected owner can manage users and every store function. Other admins can manage products, orders, refunds, reports, and seasons; standard accounts have no admin access.

## Seasons

Basketball seasons use July 1–June 30 in Atlantic time. All 62 existing orders were preserved and assigned to 2025–2026. That season has 60 paid live orders totaling C$4,840.00; the remaining records are retained and excluded from paid-live summaries. The current 2026–2027 season starts empty.

Dashboard, orders, reports, and CSV exports have explicit season selection. New checkouts record the current season in Stripe metadata. Sessions already started retain that season even if an admin switches the current season before payment completes. Older Stripe sessions/backfills are assigned by their Stripe creation date. `/admin/seasons` supports adding non-overlapping seasons and switching the current season; it does not delete or move historical orders.

## Remaining follow-ups

- Supabase reports that compromised-password protection is disabled and MFA options are insufficient. Enable compromised-password checks and enroll admins in MFA; this change does not claim MFA enforcement.
- Eight moderate dependency advisories remain in development-only ESLint tooling through minimatch. The production dependency audit is clean. Avoid forcing a framework downgrade to satisfy npm's proposed fix.
- Stripe webhook order/items persistence still uses multiple writes and needs a separate transactional/idempotency improvement for interrupted processing or repeated events. This review found no duplicate Stripe-session order groups in existing data.
- The preview uses the existing live Supabase/Stripe configuration. Administrative changes affect the real store. QA creates only a disposable Auth account and removes it; it does not place orders, issue refunds, change store settings, or send emails.

## Deployment state

Database permission hardening and additive season/fee migrations have been applied to the live Supabase database. The web security fixes, user management, and season reporting are included in production release 0.2.0, explicitly authorized November 10, 2026. Vercel deployment status determines whether the web release has completed.

## Verification results

- Production build and TypeScript checks passed; focused lint passed for new security/user/season code.
- Browser/API integration checks passed for anonymous denial (including RSC data), season switching, matching CSV totals, mobile layout, account creation, token-based password setup, standard-user denial, granting/revoking admin access, disabling access, self-lockout prevention, and cross-origin rejection.
- Disposable Auth accounts and ephemeral admin sessions were removed afterward. Live counts remained one original user, one admin, and 62 orders.
- Transaction-rollback database checks verified role grants, disabling, self-lockout rejection, season-overlap rejection, and zero anonymous order/profile visibility.
- Production dependency audit reported zero vulnerabilities; eight moderate development-only advisories remain.
- Review preview: https://foxesgear-i6u46lds8-jasonmacpei-hotmailcoms-projects.vercel.app (Vercel authentication protected). Production release 0.2.0 was explicitly authorized November 10, 2026.

## Protected owner update — v0.3.0

Jason’s existing `jasonmacpei@hotmail.com` account is the sole owner, anchored to its Auth user ID in a private, immutable registry. Database constraints and integrity triggers reject deleting or demoting the owner profile, deleting/disabling the Auth account, replacing its email, and transferring/removing the registry. Password updates and ordinary sign-ins remain available. Infrastructure administrators with direct schema-control privileges remain outside the application role model.

User pages and GET/POST/PATCH account APIs require the owner; ordinary admins cannot create users, generate setup/recovery links, change roles, or disable accounts. The user list labels Jason as “Owner · protected.” Product publishing and other store tools remain available to existing admins. The database profile policy permits staff to read only their own profile.

Transaction-rollback tests confirmed owner grant/revoke authority, rejection of staff role changes, protected owner deletion/ban/demotion, immutable ownership, restricted profile visibility, and successful active-product insertion by staff. Browser integration tests cover the same application boundary without modifying any existing products or accounts.
