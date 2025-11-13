# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.7](https://github.com/jasonmacpei/foxesgear/compare/v0.1.5...v0.1.7) (2025-11-13)

### [0.1.6](https://github.com/jasonmacpei/foxesgear/compare/v0.1.5...v0.1.6) (2025-11-13)

### [0.1.5](https://github.com/jasonmacpei/foxesgear/compare/v0.1.4...v0.1.5) (2025-10-30)


### Bug Fixes

* **reports:** force dynamic rendering so Reports reflect latest paid orders ([a04ae4c](https://github.com/jasonmacpei/foxesgear/commit/a04ae4c5d99a8877b8786654a2ad7fd4528cadb9))

### [0.1.4](https://github.com/jasonmacpei/foxesgear/compare/v0.1.3...v0.1.4) (2025-10-28)


### Bug Fixes

* **admin:** refactor effect to pass non-null selectedOrder to async function ([5ed92fa](https://github.com/jasonmacpei/foxesgear/commit/5ed92fa7493189dc456d1a4b75d8b5e3fd371dc3))

### [0.1.3](https://github.com/jasonmacpei/foxesgear/compare/v0.1.2...v0.1.3) (2025-10-28)


### Bug Fixes

* **admin:** narrow selectedOrder in effect to satisfy TS nullability ([f757601](https://github.com/jasonmacpei/foxesgear/commit/f757601561feda0a663db75394edd5ac2b19153a))

### [0.1.2](https://github.com/jasonmacpei/foxesgear/compare/v0.1.1...v0.1.2) (2025-10-28)


### Bug Fixes

* **admin:** ensure order detail loads player/group via client fetch if missing ([200b085](https://github.com/jasonmacpei/foxesgear/commit/200b0853c25fabaa350ddc797e3e3098a4e9151f))

### [0.1.1](https://github.com/jasonmacpei/foxesgear/compare/v0.1.0...v0.1.1) (2025-10-28)

## [0.1.0](https://github.com/jasonmacpei/foxesgear/compare/v0.0.13...v0.1.0) (2025-10-28)

### [0.0.13](https://github.com/jasonmacpei/foxesgear/compare/v0.0.12...v0.0.13) (2025-10-28)


### Bug Fixes

* **shop:** force dynamic rendering for shop and product detail to avoid stale cache showing inactive products ([e3c1037](https://github.com/jasonmacpei/foxesgear/commit/e3c10372276508907318cf80439f325e87e30964))

### [0.0.12](https://github.com/jasonmacpei/foxesgear/compare/v0.0.11...v0.0.12) (2025-10-28)


### Bug Fixes

* **reports:** exclude refunded and non-paid orders from printer and sales summaries (inner join orders + status filter) ([61c3e7a](https://github.com/jasonmacpei/foxesgear/commit/61c3e7ad12f737292bd0730e139aebaaa0282487))

### [0.0.11](https://github.com/jasonmacpei/foxesgear/compare/v0.0.10...v0.0.11) (2025-10-28)


### Bug Fixes

* **api:** robustly derive Stripe charge id for refunds via payment_intent latest_charge and fallback list ([0691085](https://github.com/jasonmacpei/foxesgear/commit/069108539e22135dc24c3fee9f9478b46af16354))
* **api:** select all columns in refund route to avoid missing stripe_charge_id column in typed selection ([7b6f039](https://github.com/jasonmacpei/foxesgear/commit/7b6f03991ad063c18ade1d0d71ef1f4ddd092329))

### [0.0.10](https://github.com/jasonmacpei/foxesgear/compare/v0.0.9...v0.0.10) (2025-10-28)

### [0.0.9](https://github.com/jasonmacpei/foxesgear/compare/v0.0.8...v0.0.9) (2025-10-28)


### Bug Fixes

* **api:** refund lookup tolerates stripe_session_id passed as param (OR filter) ([2e3f99a](https://github.com/jasonmacpei/foxesgear/commit/2e3f99a08244bf30299fb583cdc3402761381379))
* **checkout:** avoid setting undefined on optional error field for exactOptionalPropertyTypes ([47cf0fb](https://github.com/jasonmacpei/foxesgear/commit/47cf0fba007941b45eb3bfb89fcc4033d55f5c52))

### [0.0.8](https://github.com/jasonmacpei/foxesgear/compare/v0.0.7...v0.0.8) (2025-10-28)


### Bug Fixes

* **api:** align refund route context type with Next.js build expectations ([6fa30ca](https://github.com/jasonmacpei/foxesgear/commit/6fa30cab8324c2f153613783a74f3165a4129a6e))
* **api:** refund route types — ensure PostgrestError is null not undefined ([01beec3](https://github.com/jasonmacpei/foxesgear/commit/01beec32cf903443083e28c9b2db5cb38a27fdce))

### [0.0.7](https://github.com/jasonmacpei/foxesgear/compare/v0.0.6...v0.0.7) (2025-10-28)


### Bug Fixes

* **api): backfill inserts missing order_items; return counts\nchore(admin:** reports page fetch is dynamic to avoid stale cache ([d755436](https://github.com/jasonmacpei/foxesgear/commit/d7554365748474cccd0060a467117175639002a1))
* **api:** refund params handling and fallback by session id\n\n- Correctly access route params in Next.js app router\n- Fallback lookup by stripe_session_id to avoid order_not_found ([a2ddd8a](https://github.com/jasonmacpei/foxesgear/commit/a2ddd8a8f6a603dce7e7c95accdde90599b9bd41))
* **api:** update Next.js 16 route handler signature for refund endpoint ([bf34e17](https://github.com/jasonmacpei/foxesgear/commit/bf34e1705c62eae20fee1b0dae3f62f2c3ad326d))

### [0.0.6](https://github.com/jasonmacpei/foxesgear/compare/v0.0.5...v0.0.6) (2025-10-28)

### Features
- admin: add Refund button to Orders modal to issue full Stripe refund
- api: add POST /api/orders/[orderId]/refund to create Stripe refund and mark order refunded
- api: add POST /api/admin/backfill-from-session to backfill order + items + email by Checkout Session ID


All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.5](https://github.com/jasonmacpei/foxesgear/compare/v0.0.4...v0.0.5) (2025-10-27)


### Features

* **home:** widen hero logo, improve order copy, tighten spacing ([bcd3451](https://github.com/jasonmacpei/foxesgear/commit/bcd3451008401fe46a5e1fa234dec52d5b90ce39))

### [0.0.4](https://github.com/jasonmacpei/foxesgear/compare/v0.0.3...v0.0.4) (2025-10-27)


### Features

* **ui:** center and enlarge toast notifications for visibility ([4e8bdba](https://github.com/jasonmacpei/foxesgear/commit/4e8bdbacec5feda77dbcf4f2a858d41e6604ad73))

### [0.0.3](https://github.com/jasonmacpei/foxesgear/compare/v0.0.2...v0.0.3) (2025-10-27)


### Features

* **admin/orders:** client modal to view order items; fix env filter by deriving from id + flag ([5c2cce3](https://github.com/jasonmacpei/foxesgear/commit/5c2cce3c115adf06c4c8fbf792666a3a3467ef09))
* **admin/orders:** format dates in Atlantic timezone and friendlier ([610775c](https://github.com/jasonmacpei/foxesgear/commit/610775c1d6f11f3e157d9f452ec8a290b22399a5))
* **admin/orders:** use service client and add env toggle for test/non-test; show test badge ([087f89d](https://github.com/jasonmacpei/foxesgear/commit/087f89d3ef8370aaa5816230e407a5664718eaee))
* **cart:** add toast feedback on add-to-cart ([951c3d2](https://github.com/jasonmacpei/foxesgear/commit/951c3d2785fe2195b0861e0f68d86977d5024376))
* **orders:** store stripe_charge_id and fee/net cents; enhance webhook to fetch from payment_intent ([8b130a3](https://github.com/jasonmacpei/foxesgear/commit/8b130a399a5c050585359cc2732508a02b21d3e7))
* **reports:** add printer CSV endpoint and on-page previews; add sales CSV with Stripe fee summary ([001bbb3](https://github.com/jasonmacpei/foxesgear/commit/001bbb3372166cb7173fa9002b3b603b1abe8364))
* **reports:** add total revenue row and optional Stripe fee summary on page ([39182e7](https://github.com/jasonmacpei/foxesgear/commit/39182e7781371e33570c3bf970a6fe514c74d614))


### Bug Fixes

* **admin/orders:** avoid nullable access by passing orderId param to loader ([d46fad6](https://github.com/jasonmacpei/foxesgear/commit/d46fad6d3f0a723f933eeaa5bf4f351d902d0fbc))
* **admin/orders:** default env filter to All to avoid empty list on first load ([750a75b](https://github.com/jasonmacpei/foxesgear/commit/750a75b2d94f36d1ef2bb77605c983bd4822e8ef))
* **admin/orders:** force-dynamic to avoid caching and ensure fresh fetch ([d59e228](https://github.com/jasonmacpei/foxesgear/commit/d59e2282ccea5882c91d5a92861b9bd4b3f9fff3))
* **admin/orders:** satisfy TS narrowing for selectedOrder in effect ([f51f50c](https://github.com/jasonmacpei/foxesgear/commit/f51f50c393197e707b120e6b90ee3f4a1ba6c649))
* **email:** remove product link from line items to prevent URL rendering ([0693743](https://github.com/jasonmacpei/foxesgear/commit/06937430bfec3fda8392119aaabdc9b52356f9bf))
* **email:** use replyTo property for Resend API ([29da42d](https://github.com/jasonmacpei/foxesgear/commit/29da42d5b30560960f2f6e15220eb27c70530c0b))

### [0.0.2](https://github.com/jasonmacpei/foxesgear/compare/v0.0.1...v0.0.2) (2025-10-27)


### Features

* **email): styled receipt with logo, items, variants, reply-to; fix(webhook): expand price.product and persist size/color; feat(order): add is_test; feat(success): clear cart on success; feat(checkout:** include product slug in metadata ([3d7675f](https://github.com/jasonmacpei/foxesgear/commit/3d7675f842b4c4ec1dfe7587840d70d181284ebe))

### 0.0.1 (2025-10-27)


### Features

* **checkout:** collect and persist customer details; add schema fields ([63404bd](https://github.com/jasonmacpei/foxesgear/commit/63404bd502682c13206be11c6484238145e26844))


### Bug Fixes

* Button supports asChild; unblock Vercel build ([46bc9cd](https://github.com/jasonmacpei/foxesgear/commit/46bc9cdbee25a6babb4c5df3db6fb2f10f662e34))
* import Stripe types in webhook route ([ce68cfe](https://github.com/jasonmacpei/foxesgear/commit/ce68cfeca978a67f9391955336414b23e118e197))
* wrap reset-password page in Suspense to satisfy useSearchParams CSR bailout ([b55461a](https://github.com/jasonmacpei/foxesgear/commit/b55461a05db150adec512a1148c0cde0bafbf015))

# Changelog

All notable changes to this project will be documented in this file.

The format follows Conventional Commits and is generated by the release scripts.

- Run `npm run release:first` for the initial tagged release.
- Run `npm run release:patch|minor|major` for subsequent releases.
