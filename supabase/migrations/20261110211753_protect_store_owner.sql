-- Bootstrap the sole store owner from the verified existing account, not a generated UUID.
create table private.store_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  foreign key (user_id) references public.profiles(id) on delete restrict
);
alter table private.store_owner enable row level security;
revoke all on private.store_owner from public, anon, authenticated, service_role;
grant usage on schema private to service_role;
grant select on private.store_owner to service_role;
do $$
begin
  if (select count(*) from auth.users where lower(email) = 'jasonmacpei@hotmail.com') <> 1 then
    raise exception 'Expected exactly one verified owner account';
  end if;
  insert into private.store_owner(user_id)
    select id from auth.users where lower(email) = 'jasonmacpei@hotmail.com';
  update public.profiles set is_admin = true, is_disabled = false
    where id = (select user_id from private.store_owner);
  if not found then raise exception 'Owner profile missing'; end if;
end $$;

create function public.store_owner_id() returns uuid
language sql stable security invoker set search_path = '' as $$
  select user_id from private.store_owner where singleton;
$$;
revoke all on function public.store_owner_id() from public, anon, authenticated;
grant execute on function public.store_owner_id() to service_role;

-- No application role, including the backend service, can transfer or remove ownership.
create function private.keep_store_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Store ownership is protected';
end;
$$;
revoke all on function private.keep_store_owner() from public, anon, authenticated, service_role;
create trigger keep_store_owner before update or delete or truncate on private.store_owner
for each statement execute function private.keep_store_owner();

-- These are integrity triggers, not authorization helpers. They intentionally protect
-- the owner for every caller, including Auth's internal role where auth.uid() is NULL.
-- Definer privileges are needed only to read the private registry from those triggers.
create function private.protect_owner_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.id = (select user_id from private.store_owner where singleton) then
    if tg_op = 'DELETE' then raise exception 'Owner account is protected'; end if;
    if new.id is distinct from old.id or not new.is_admin or new.is_disabled then
      raise exception 'Owner account is protected';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_owner_profile() from public, anon, authenticated, service_role;
create trigger protect_owner_profile before update or delete on public.profiles
for each row execute function private.protect_owner_profile();

create function private.protect_owner_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.id = (select user_id from private.store_owner where singleton) then
    if tg_op = 'DELETE' then raise exception 'Owner account is protected'; end if;
    if new.id is distinct from old.id or new.email is distinct from old.email
       or new.deleted_at is not null or new.banned_until > now() then
      raise exception 'Owner account is protected';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_owner_auth() from public, anon, authenticated, service_role;
create trigger protect_owner_auth before update or delete on auth.users
for each row execute function private.protect_owner_auth();

create or replace function public.manage_user_access(actor_id uuid, target_id uuid, make_admin boolean, disable_user boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(4827401);
  if target_id = (select user_id from private.store_owner where singleton) then
    raise exception 'Owner account is protected';
  end if;
  if not exists (
    select 1 from private.store_owner o join public.profiles p on p.id = o.user_id
    where o.user_id = actor_id and p.is_admin and not p.is_disabled
  ) then raise exception 'Owner required'; end if;
  update public.profiles set is_admin = make_admin and not disable_user, is_disabled = disable_user where id = target_id;
  if not found then raise exception 'User not found'; end if;
end;
$$;
revoke all on function public.manage_user_access(uuid,uuid,boolean,boolean) from public, anon, authenticated;
grant execute on function public.manage_user_access(uuid,uuid,boolean,boolean) to service_role;

-- Other admins do not need to enumerate staff profiles; backend owner tools list users.
alter policy profiles_select_self_admin on public.profiles using (id = (select auth.uid()));
