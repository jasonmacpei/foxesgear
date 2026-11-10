alter table public.profiles
  add column invitation_email_status text not null default 'not_sent' check(invitation_email_status in ('not_sent','sending','sent','failed')),
  add column invitation_sent_at timestamptz,
  add column invitation_attempted_at timestamptz,
  add column invitation_attempt_id uuid,
  add column setup_complete boolean not null default false,
  add column setup_completed_at timestamptz;

-- Historical setup dates are known only when recorded by Auth's audit log.
update public.profiles p set setup_complete=true,
  setup_completed_at=(select min(a.created_at) from auth.audit_log_entries a
    where a.payload->>'action'='user_updated_password' and a.payload->>'actor_id'=p.id::text)
from auth.users u where u.id=p.id and coalesce(u.encrypted_password,'')<>'';

create table private.signup_email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  completed_at timestamptz not null,
  status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
  attempts int not null default 0,
  available_at timestamptz not null default now()+interval '2 minutes',
  lease_until timestamptz,
  claim_id uuid,
  sent_at timestamptz,
  message_id text,
  last_error text
);
alter table private.signup_email_outbox enable row level security;
revoke all on private.signup_email_outbox from public,anon,authenticated;
grant all on private.signup_email_outbox to service_role;
create index signup_email_due on private.signup_email_outbox(available_at) where status<>'sent';

-- Integrity trigger: Auth's internal role has no auth.uid(). Definer privileges
-- record the actual password update and a durable notification, never metadata claims.
create function private.record_account_setup() returns trigger
language plpgsql security definer set search_path='' as $$
declare profile_name text;
begin
  if new.encrypted_password is distinct from old.encrypted_password and coalesce(new.encrypted_password,'')<>'' then
    update public.profiles set setup_complete=true,setup_completed_at=now()
      where id=new.id and not setup_complete returning full_name into profile_name;
    if found then
      insert into private.signup_email_outbox(user_id,email,full_name,completed_at)
        values(new.id,new.email,coalesce(profile_name,''),now()) on conflict(user_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.record_account_setup() from public,anon,authenticated,service_role;
create trigger record_account_setup after update of encrypted_password on auth.users
for each row execute function private.record_account_setup();

create function public.reserve_invitation_email(actor_id uuid,target_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare p public.profiles; reservation uuid:=gen_random_uuid();
begin
  if not exists(select 1 from private.store_owner o join public.profiles p on p.id=o.user_id
    where o.user_id=actor_id and p.is_admin and not p.is_disabled) then raise exception 'Owner required'; end if;
  select * into p from public.profiles where id=target_id for update;
  if not found or p.is_disabled then raise exception 'User unavailable'; end if;
  if p.invitation_attempted_at>now()-interval '60 seconds' then raise exception 'Please wait one minute before resending'; end if;
  update public.profiles set invitation_attempt_id=reservation,invitation_attempted_at=now(),invitation_email_status='sending' where id=target_id;
  return reservation;
end;
$$;
revoke all on function public.reserve_invitation_email(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_invitation_email(uuid,uuid) to service_role;

create function public.claim_signup_emails(target_user_id uuid default null)
returns table(id uuid,user_id uuid,email text,full_name text,completed_at timestamptz,claim_id uuid)
language sql security invoker set search_path='' as $$
  with due as (
    select o.id from private.signup_email_outbox o
    where o.status<>'sent' and o.attempts<8 and (o.lease_until is null or o.lease_until<now())
      and (target_user_id is not null or o.available_at<=now())
      and (target_user_id is null or o.user_id=target_user_id)
    order by o.available_at for update skip locked limit 3
  )
  update private.signup_email_outbox o set status='sending',attempts=o.attempts+1,
    lease_until=now()+interval '2 minutes',claim_id=gen_random_uuid()
  from due where o.id=due.id
  returning o.id,o.user_id,o.email,o.full_name,o.completed_at,o.claim_id;
$$;
revoke all on function public.claim_signup_emails(uuid) from public,anon,authenticated;
grant execute on function public.claim_signup_emails(uuid) to service_role;

create function public.finish_signup_email(job_id uuid,job_claim_id uuid,provider_message_id text,error_text text)
returns void language sql security invoker set search_path='' as $$
  update private.signup_email_outbox set
    status=case when error_text is null then 'sent' else 'failed' end,
    sent_at=case when error_text is null then now() else null end,
    message_id=provider_message_id,last_error=left(error_text,300),lease_until=null,
    available_at=now()+make_interval(secs=>least(3600,(power(2,attempts)*60)::int))
  where id=job_id and claim_id=job_claim_id and status='sending';
$$;
revoke all on function public.finish_signup_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_signup_email(uuid,uuid,text,text) to service_role;
