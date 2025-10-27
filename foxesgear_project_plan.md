# FoxesGear.com Project Plan

## Overview

FoxesGear.com will serve as the official online retail shop for the Stratford Foxes Basketball Association. The goal is to provide a clean, simple, and user-friendly online experience for players and parents to purchase branded apparel like t-shirts, hoodies, and hats. The system will support dynamic product management, variant configuration (size, color), Stripe-based payments, and bulk-order reporting for the printer.

---

## 1. Objectives

- Create a **minimal, fast-loading** e-commerce platform using modern web technologies.
- Support approximately 6 initial products, expandable dynamically via an admin dashboard.
- Allow users to select **sizes, colors, and quantities** for each product.
- Handle checkout through **Stripe** (default) and **E-transfer** (optional fallback).
- Provide **automated reporting** for internal tracking and bulk supplier orders.
- Enable **dynamic product management** (add/edit products, upload photos, change pricing).
- Use **Supabase** for backend and database, **Next.js** for frontend, **Tailwind CSS** for styling, and **Vercel** for hosting.
- Maintain **strict TypeScript** compliance to ensure stability and successful Vercel deployment.

---

## 2. Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS, TypeScript (strict mode)
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Payments:** Stripe Checkout + Webhooks
- **Email:** Resend (for order confirmations)
- **Hosting:** Vercel
- **Domain:** foxesgear.com

---

## 3. Architecture

**Frontend (Next.js)**

- Public routes: Home, Shop, Product Detail, Cart, Checkout, Success
- Admin routes: Dashboard, Products, Orders, Reports

**Backend (Vercel + Supabase)**

- Supabase handles authentication, data, storage, and RLS.
- API routes on Vercel handle checkout, Stripe webhooks, and reporting.

**Flow:**

1. User browses products.
2. Adds items to cart (local storage based).
3. Proceeds to checkout → Stripe Checkout Session.
4. Stripe payment → webhook confirms payment → updates Supabase order status.
5. Confirmation email sent via Resend.

---

## 4. Data Model (Supabase)

### Tables

- **profiles**: user info, admin flag
- **products**: name, description, slug, active, sort order
- **product\_options**: options for each product (size, color)
- **product\_variants**: specific variant combinations (size/color/price)
- **orders**: order header with totals and payment details
- **order\_items**: line items for each product in an order
- **settings**: global settings (preorder windows, e-transfer email, pickup info)

### Example Schema Highlights

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  size_value text,
  color_value text,
  price_cents int not null,
  sku text unique,
  image_url text,
  active boolean not null default true
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  payment_method text not null,
  status text not null default 'pending',
  amount_total_cents int not null,
  stripe_session_id text,
  paid_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_name text not null,
  size_value text,
  color_value text,
  quantity int not null,
  unit_price_cents int not null,
  line_total_cents int not null
);
```

---

## 5. Features

### Public Site

- **Home Page:** Foxes branding, CTA to Shop.
- **Shop Page:** Product grid with filtering by category or product type.
- **Product Detail Page:**
  - Photo gallery (Supabase Storage)
  - Variant selectors (size, color)
  - Dynamic pricing display
  - Add-to-cart functionality
- **Cart Page:**
  - View and edit cart items
  - Calculate subtotal and total
- **Checkout Page:**
  - Stripe payment flow (preferred)
  - Optional e-transfer instructions
- **Success Page:** Confirmation of payment and pickup details

### Admin Area

- **Dashboard:** Overview of total sales, number of orders, revenue.
- **Products Page:**
  - CRUD for products (name, price, active/inactive)
  - Upload product images (Supabase Storage)
  - Manage sizes/colors dynamically
- **Orders Page:**
  - View all orders (filter by status: pending, paid, fulfilled)
  - Manually mark orders as paid (for e-transfer)
- **Reports Page:**
  - Generate CSV reports for bulk printing
  - Export sales summaries by product or variant

---

## 6. Payment Flow (Stripe)

1. User confirms cart and clicks **Checkout**.
2. `/api/checkout` validates cart items, creates Stripe Checkout Session.
3. Redirects user to Stripe Checkout.
4. Upon successful payment, Stripe webhook updates order in Supabase (`status = paid`).
5. User redirected to success page with confirmation.

---

## 7. Reporting

### Printer Summary (SQL)

```sql
select
  oi.product_name,
  coalesce(oi.size_value,'') as size,
  coalesce(oi.color_value,'') as color,
  sum(oi.quantity) as qty
from order_items oi
join orders o on o.id = oi.order_id
where o.status = 'paid'
group by 1,2,3
order by 1,2,3;
```

### Sales Summary

```sql
select
  oi.product_name,
  sum(oi.line_total_cents) as revenue_cents,
  sum(oi.quantity) as qty
from order_items oi
join orders o on o.id = oi.order_id
where o.status = 'paid'
group by 1
order by revenue_cents desc;
```

---

## 8. Pre-Order Controls

- Configure pre-order start and end dates via **settings** table.
- Display countdown banner on the homepage.
- Disable checkout if the window is closed.

---

## 9. Emails

- **Order Confirmation:** Sent automatically after payment.
- **Payment Confirmation:** Triggered by webhook or manual payment mark.
- **Pickup Notification:** Sent when pre-order closes.

---

## 10. Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`

---

## 11. Dynamic Product Management

- Admin can:
  - Create/edit/delete products.
  - Adjust prices, colors, and sizes.
  - Upload images via Supabase Storage.
  - Toggle availability (active/inactive).
- New products instantly appear in the public shop.

---

## 12. Deployment & CI/CD

- Hosted on **Vercel** using GitHub integration.
- **Automatic deploy on push** to main branch.
- **Linting:** ESLint + Prettier enforced.
- **Testing:** Playwright e2e tests for checkout flow.

---

## 13. Project Phases

### Phase 1: Foundation (Days 1–3)

- Initialize Next.js + Tailwind + Supabase + Stripe.
- Create database schema and RLS policies.
- Implement homepage and catalog layout.

### Phase 2: Cart & Checkout (Days 4–6)

- Build cart system (localStorage persistence).
- Implement Stripe Checkout.
- Handle webhooks for payment status updates.

### Phase 3: Admin & Reporting (Days 7–9)

- Build admin dashboard, product CRUD, and reporting pages.
- Add CSV export routes.

### Phase 4: Final Polish (Days 10–14)

- Add pre-order logic, responsive UI, Resend emails.
- Deploy to Vercel and test full Stripe flow.
- Prepare documentation and admin walkthrough.

---

## 14. Future Enhancements

- Coupon codes and discounts.
- Inventory tracking.
- Shipping options.
- Public order lookup by email + order ID.
- Localization and tax integration.

---

## 15. Admin To-Dos Before Launch

- Add initial products, prices, and images.
- Configure Stripe products/prices.
- Set pre-order dates.
- Verify webhook in Stripe Dashboard.
- Test purchase end-to-end.
- Generate printer report mock.

---

## 16. Summary

FoxesGear.com will be a simple, maintainable, and efficient pre-order storefront designed for community-level retail. The platform combines the ease of use of Stripe payments, Supabase for lightweight data management, and Vercel’s reliability for deployment. The admin dashboard provides just enough flexibility for managing new products and running future gear sales without any developer overhead.

---

**Next step:** Initialize the repository in Cursor and import this `project-plan.md` as the project brief. Then, we can generate the first components (schema, API routes, UI skeleton) and scaffold the Supabase integration.

