-- Enforce invitation-only account creation even if public Auth signup is enabled.
-- A one-time token is reserved by the owner API, consumed by Auth's insert, and
-- stripped from metadata. Public signup/OTP/OAuth requests cannot forge a reservation.
create table private.pending_user_invites (
  email text primary key,
  token uuid not null unique,
  expires_at timestamptz not null
);
alter table private.pending_user_invites enable row level security;
revoke all on private.pending_user_invites from public, anon, authenticated;
grant all on private.pending_user_invites to service_role;

create function public.authorize_user_invitation(actor_id uuid, invite_email text, invite_token uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from private.store_owner o join public.profiles p on p.id=o.user_id
    where o.user_id=actor_id and p.is_admin and not p.is_disabled
  ) then raise exception 'Owner required'; end if;
  delete from private.pending_user_invites where expires_at < now();
  insert into private.pending_user_invites(email,token,expires_at)
  values(lower(invite_email),invite_token,now()+interval '5 minutes')
  on conflict(email) do update set token=excluded.token,expires_at=excluded.expires_at;
end;
$$;
revoke all on function public.authorize_user_invitation(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.authorize_user_invitation(uuid,text,uuid) to service_role;

-- Integrity trigger: Auth's internal role has no auth.uid() and cannot read the
-- private reservation table. Definer privileges allow only consuming a matching token.
create function private.require_user_invitation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.pending_user_invites where email=lower(new.email)
    and token::text=new.raw_user_meta_data->>'owner_invitation_token' and expires_at>now();
  if not found then raise exception 'Store accounts require an owner invitation'; end if;
  new.raw_user_meta_data := new.raw_user_meta_data - 'owner_invitation_token';
  return new;
end;
$$;
revoke all on function private.require_user_invitation() from public, anon, authenticated, service_role;
create trigger require_user_invitation before insert on auth.users
for each row execute function private.require_user_invitation();
