create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  starts_on date not null unique,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create unique index seasons_one_current on public.seasons (is_current) where is_current;
alter table public.seasons enable row level security;
grant select on public.seasons to authenticated;
grant all on public.seasons to service_role;
create policy seasons_admin_read on public.seasons for select to authenticated using (private.is_admin((select auth.uid())));

-- Derive historical basketball seasons in Atlantic time; preserve every order.
insert into public.seasons (name, starts_on, ends_on)
select y::text || '–' || (y+1)::text, make_date(y,7,1), make_date(y+1,6,30)
from (select distinct extract(year from (created_at at time zone 'America/Halifax') - interval '6 months')::int y from public.orders) years;
insert into public.seasons (name, starts_on, ends_on, is_current)
values ('2026–2027', '2026-07-01', '2027-06-30', true)
on conflict (starts_on) do update set is_current = true;

alter table public.orders add column season_id uuid references public.seasons(id);
update public.orders o set season_id = s.id from public.seasons s
where (o.created_at at time zone 'America/Halifax')::date between s.starts_on and s.ends_on;
alter table public.orders alter column season_id set not null;
create index orders_season_created on public.orders (season_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Compatibility for a checkout already in flight during rollout.
create function public.assign_order_season() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.season_id is null then
    select id into new.season_id from public.seasons
    where (new.created_at at time zone 'America/Halifax')::date between starts_on and ends_on;
    if new.season_id is null then raise exception 'No season for order date'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.assign_order_season() from public, anon, authenticated;
create trigger assign_order_season before insert on public.orders for each row execute function public.assign_order_season();

create function public.manage_season(actor_id uuid, season_name text, start_date date, end_date date, activate boolean, target_id uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result_id uuid;
begin
  perform pg_advisory_xact_lock(4827402);
  if not exists (select 1 from public.profiles where id = actor_id and is_admin and not is_disabled) then raise exception 'Admin required'; end if;
  if target_id is null then
    if end_date < start_date or exists(select 1 from public.seasons where starts_on <= end_date and ends_on >= start_date) then
      raise exception 'Season dates overlap or are invalid';
    end if;
    insert into public.seasons(name,starts_on,ends_on) values(season_name,start_date,end_date) returning id into result_id;
  else
    select id into result_id from public.seasons where id = target_id;
    if result_id is null then raise exception 'Season not found'; end if;
  end if;
  if activate then
    update public.seasons set is_current = false where is_current;
    update public.seasons set is_current = true where id = result_id;
  end if;
  return result_id;
end;
$$;
revoke all on function public.manage_season(uuid,text,date,date,boolean,uuid) from public, anon, authenticated;
grant execute on function public.manage_season(uuid,text,date,date,boolean,uuid) to service_role;
