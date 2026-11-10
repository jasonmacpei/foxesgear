-- Preserve all existing accounts/orders. Authorization must use live database roles.
alter table public.profiles add column if not exists is_disabled boolean not null default false;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.is_admin(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid = (select auth.uid()) and exists (
    select 1 from public.profiles p where p.id = uid and p.is_admin and not p.is_disabled
  );
$$;
revoke all on function private.is_admin(uuid) from public, anon;
grant execute on function private.is_admin(uuid) to authenticated;
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Restrict admin policies to signed-in users, and retire the exposed definer helper.
do $$ declare p record; begin
  for p in select * from pg_policies where schemaname in ('public','storage')
    and (qual like '%is_admin(%' or with_check like '%is_admin(%') loop
    execute format('alter policy %I on %I.%I to authenticated%s%s', p.policyname, p.schemaname, p.tablename,
      case when p.qual is not null then ' using (' || replace(p.qual, 'is_admin(', 'private.is_admin(') || ')' else '' end,
      case when p.with_check is not null then ' with check (' || replace(p.with_check, 'is_admin(', 'private.is_admin(') || ')' else '' end);
  end loop;
end $$;
drop function public.is_admin(uuid);

-- Orders are recorded only by verified Stripe webhook/server code.
drop policy if exists orders_insert_auth on public.orders;
drop policy if exists order_items_insert_auth on public.order_items;
-- Role changes go through the protected server function, never a browser table update.
drop policy if exists profiles_write_admin on public.profiles;

create or replace function public.manage_user_access(actor_id uuid, target_id uuid, make_admin boolean, disable_user boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(4827401);
  if actor_id = target_id then raise exception 'Cannot change own access'; end if;
  if not exists(select 1 from public.profiles where id = actor_id and is_admin and not is_disabled) then
    raise exception 'Admin required';
  end if;
  update public.profiles set is_admin = make_admin and not disable_user, is_disabled = disable_user where id = target_id;
  if not found then raise exception 'User not found'; end if;
end;
$$;
revoke all on function public.manage_user_access(uuid,uuid,boolean,boolean) from public, anon, authenticated;
grant execute on function public.manage_user_access(uuid,uuid,boolean,boolean) to service_role;
