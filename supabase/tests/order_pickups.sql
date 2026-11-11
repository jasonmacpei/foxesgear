-- Run after add_order_pickups in a disposable database. All fixtures roll back.
begin;
set local role service_role;

do $$
<<order_pickups_test>>
declare
  admin_id uuid;
  member_id uuid;
  disabled_id uuid;
  season_id uuid;
  order_id uuid := gen_random_uuid();
  saved_at timestamptz;
begin
  -- The scratch database seeds one active admin, one disabled admin and one member.
  select id into strict admin_id from public.profiles where is_admin and not is_disabled;
  select id into strict member_id from public.profiles where not is_admin;
  select id into strict disabled_id from public.profiles where is_admin and is_disabled;
  select id into strict season_id from public.seasons where is_current;

  if has_table_privilege('anon', 'public.order_pickups', 'select')
    or has_table_privilege('authenticated', 'public.order_pickups', 'insert')
    or has_function_privilege('authenticated',
      'public.set_order_pickup(uuid,uuid,uuid,boolean,timestamptz)', 'execute') then
    raise exception 'Pickup records must be accessible only by the server';
  end if;

  insert into public.orders(id, season_id, email, customer_name, affiliated_player,
    affiliated_group, phone, payment_method, status, amount_total_cents)
  values(order_id, season_id, 'pickup-qa@example.invalid', 'QA customer', 'QA player',
    'QA group', '', 'stripe', 'paid', 5000);

  begin
    perform public.set_order_pickup(member_id, order_id, season_id, true, null);
    raise exception 'A non-admin was able to record pickup';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_order_pickup(disabled_id, order_id, season_id, true, null);
    raise exception 'A disabled admin was able to record pickup';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.set_order_pickup(admin_id, order_id, gen_random_uuid(), true, null);
    raise exception 'An order was changed from another season';
  exception when no_data_found then null;
  end;

  saved_at := public.set_order_pickup(admin_id, order_id, season_id, true, null);
  if saved_at is null or not exists (
    select 1 from public.order_pickups p where p.order_id = order_pickups_test.order_id
      and p.collected_at = saved_at and p.recorded_by = admin_id
  ) then raise exception 'Pickup was not persisted'; end if;
  if not exists (select 1 from public.orders o where o.id = order_id
    and o.status = 'paid' and o.amount_total_cents = 5000) then
    raise exception 'Pickup changed payment data';
  end if;

  begin
    perform public.set_order_pickup(admin_id, order_id, season_id, false, null);
    raise exception 'A stale update was allowed to undo collection';
  exception when serialization_failure then null;
  end;

  saved_at := public.set_order_pickup(admin_id, order_id, season_id, false, saved_at);
  if saved_at is not null
    or exists (select 1 from public.order_pickups p where p.order_id = order_pickups_test.order_id)
  then raise exception 'Undo did not clear pickup'; end if;

  update public.orders set is_test = true where id = order_id;
  begin
    perform public.set_order_pickup(admin_id, order_id, season_id, true, null);
    raise exception 'A test order was marked collected';
  exception when no_data_found then null;
  end;
  update public.orders set is_test = false, status = 'refunded' where id = order_id;
  begin
    perform public.set_order_pickup(admin_id, order_id, season_id, true, null);
    raise exception 'A refunded order was marked collected';
  exception when no_data_found then null;
  end;
end $$;

rollback;
