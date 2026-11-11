-- Collection is separate from payment status and historical sales totals.
create table public.order_pickups (
  order_id uuid primary key references public.orders(id) on delete cascade,
  collected_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null
);
alter table public.order_pickups enable row level security;
create index order_pickups_recorded_by_idx on public.order_pickups(recorded_by);
revoke all on public.order_pickups from public, anon, authenticated, service_role;
grant select, insert, delete on public.order_pickups to service_role;

-- Server only, after checking the signed-in admin and request origin.
-- Serialize pickup changes with each other and with order status updates.
create function public.set_order_pickup(
  actor_id uuid,
  target_order_id uuid,
  target_season_id uuid,
  is_collected boolean,
  expected_collected_at timestamptz
) returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare saved_at timestamptz;
begin
  if not exists (select 1 from public.profiles p
    where p.id = actor_id and p.is_admin and not p.is_disabled) then
    raise exception 'Admin required' using errcode = '42501';
  end if;
  if is_collected is null then raise exception 'Collection choice required'; end if;
  perform 1 from public.orders o where o.id = target_order_id
    and o.season_id = target_season_id and o.status = 'paid' and not o.is_test
    for update;
  if not found then
    raise exception 'Paid live order not found in this season' using errcode = 'P0002';
  end if;
  select p.collected_at into saved_at from public.order_pickups p where p.order_id = target_order_id;
  if saved_at is distinct from expected_collected_at then
    raise exception 'Pickup changed; refresh and try again' using errcode = '40001';
  end if;
  if is_collected then
    if saved_at is null then
      insert into public.order_pickups(order_id, recorded_by) values (target_order_id, actor_id)
        returning collected_at into saved_at;
    end if;
  else
    delete from public.order_pickups where order_id = target_order_id;
    saved_at := null;
  end if;
  return saved_at;
end;
$$;
revoke all on function public.set_order_pickup(uuid,uuid,uuid,boolean,timestamptz) from public, anon, authenticated;
grant execute on function public.set_order_pickup(uuid,uuid,uuid,boolean,timestamptz) to service_role;
