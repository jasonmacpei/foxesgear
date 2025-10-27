-- Enable RLS on all domain tables
alter table if exists products enable row level security;
alter table if exists product_variants enable row level security;
alter table if exists orders enable row level security;
alter table if exists order_items enable row level security;
alter table if exists settings enable row level security;

-- Profiles table (admin flag) if missing
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

alter table if exists profiles enable row level security;

-- Helper: check admin
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from profiles p where p.id = uid and p.is_admin = true
  );
$$;

-- Auto-create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, is_admin)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null), false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- PRODUCTS
drop policy if exists products_select_all on products;
create policy products_select_all on products for select using (true);

drop policy if exists products_write_admin on products;
create policy products_write_admin on products for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- PRODUCT VARIANTS
drop policy if exists product_variants_select_all on product_variants;
create policy product_variants_select_all on product_variants for select using (true);

drop policy if exists product_variants_write_admin on product_variants;
create policy product_variants_write_admin on product_variants for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ORDERS (owner can read, admin full)
drop policy if exists orders_select_owner_admin on orders;
create policy orders_select_owner_admin on orders for select using (
  auth.uid() = user_id or public.is_admin(auth.uid())
);

drop policy if exists orders_insert_auth on orders;
create policy orders_insert_auth on orders for insert with check (
  auth.role() = 'authenticated' or public.is_admin(auth.uid())
);

drop policy if exists orders_write_admin on orders;
create policy orders_write_admin on orders for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ORDER ITEMS (follow parent order visibility)
drop policy if exists order_items_select_owner_admin on order_items;
create policy order_items_select_owner_admin on order_items for select using (
  exists (
    select 1 from orders o where o.id = order_items.order_id and (o.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists order_items_insert_auth on order_items;
create policy order_items_insert_auth on order_items for insert with check (
  auth.role() = 'authenticated' or public.is_admin(auth.uid())
);

drop policy if exists order_items_write_admin on order_items;
create policy order_items_write_admin on order_items for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- SETTINGS (public read for banner/pickup info; admin write)
drop policy if exists settings_select_all on settings;
create policy settings_select_all on settings for select using (true);

drop policy if exists settings_write_admin on settings;
create policy settings_write_admin on settings for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- PROFILES (user can read own; admin full)
drop policy if exists profiles_select_self_admin on profiles;
create policy profiles_select_self_admin on profiles for select using (
  id = auth.uid() or public.is_admin(auth.uid())
);

drop policy if exists profiles_write_admin on profiles;
create policy profiles_write_admin on profiles for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Public storage bucket for product images (version-agnostic)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'product-images') then
    insert into storage.buckets (id, name, public)
    values ('product-images', 'product-images', true);
  end if;
end $$;


-- STORAGE POLICIES for product-images bucket
-- Allow anyone to read images in this bucket
drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects
for select using (
  bucket_id = 'product-images'
);

-- Allow only admins to write (insert/update/delete) images in this bucket
drop policy if exists product_images_write_admin on storage.objects;
create policy product_images_write_admin on storage.objects
for all using (
  bucket_id = 'product-images' and public.is_admin(auth.uid())
) with check (
  bucket_id = 'product-images' and public.is_admin(auth.uid())
);

