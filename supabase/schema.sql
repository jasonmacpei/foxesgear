-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- Product variants
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  size_value text,
  color_value text,
  price_cents int not null,
  sku text unique,
  image_url text,
  active boolean not null default true
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  customer_name text not null,
  affiliated_player text not null,
  affiliated_group text not null,
  phone text not null,
  payment_method text not null,
  status text not null default 'pending',
  amount_total_cents int not null,
  stripe_session_id text,
  is_test boolean not null default false,
  stripe_charge_id text,
  stripe_fee_cents int,
  stripe_net_cents int,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Optional: constrain affiliated_group to known values
-- alter table orders
--   add constraint chk_affiliated_group
--   check (affiliated_group in (
--     'Tykes - Kindegarden',
--     'Small Ball Girls (Gr 1-2)',
--     'Small Ball Boys (Gr 1-2)',
--     'Jr Mini Girls (Gr 3-4)',
--     'Jr Mini Boys (Gr 3-4)',
--     'Mini Girls House (Gr 5-6)',
--     'Mini Boys House (Gr 5-6)',
--     'Mini Girls Rep (Gr 5-6)',
--     'Mini Boys Rep (Gr 5-6)'
--   ));

-- Order items
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_name text not null,
  size_value text,
  color_value text,
  quantity int not null,
  unit_price_cents int not null,
  line_total_cents int not null
);

-- Settings
create table if not exists settings (
  id int primary key default 1,
  preorder_start timestamptz,
  preorder_end timestamptz,
  etransfer_email text,
  pickup_info text
);

-- RLS placeholders (enable and add policies in Supabase SQL editor)
-- alter table products enable row level security;
-- alter table product_variants enable row level security;
-- alter table orders enable row level security;
-- alter table order_items enable row level security;
-- alter table settings enable row level security;


