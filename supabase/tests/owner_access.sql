-- Integrity tests run entirely within a rolled-back transaction.
begin;
do $$
declare owner_id uuid := public.store_owner_id(); staff_id uuid; target uuid := gen_random_uuid();
begin
  select id into staff_id from public.profiles where id <> owner_id and is_admin and not is_disabled limit 1;
  if staff_id is null then raise exception 'Need an existing staff admin for this integration check'; end if;
  insert into auth.users(id,email,raw_user_meta_data) values(target,'owner-transaction-qa@example.invalid','{}');
  begin
    perform public.manage_user_access(staff_id,target,true,false);
    raise exception 'Non-owner changed user access';
  exception when raise_exception then if sqlerrm <> 'Owner required' then raise; end if; end;
  perform public.manage_user_access(owner_id,target,true,false);
  if not exists(select 1 from public.profiles where id=target and is_admin) then raise exception 'Owner grant failed'; end if;
  perform public.manage_user_access(owner_id,target,false,true);
  if not exists(select 1 from public.profiles where id=target and is_disabled and not is_admin) then raise exception 'Owner revocation failed'; end if;
  begin
    perform public.manage_user_access(owner_id,owner_id,false,true);
    raise exception 'Owner access changed';
  exception when raise_exception then if sqlerrm <> 'Owner account is protected' then raise; end if; end;
  begin
    update public.profiles set is_admin=false where id=owner_id;
    raise exception 'Owner demoted directly';
  exception when raise_exception then if sqlerrm <> 'Owner account is protected' then raise; end if; end;
  begin
    delete from public.profiles where id=owner_id;
    raise exception 'Owner profile deleted';
  exception when raise_exception then if sqlerrm <> 'Owner account is protected' then raise; end if; end;
  begin
    delete from auth.users where id=owner_id;
    raise exception 'Owner Auth account deleted';
  exception when raise_exception then if sqlerrm <> 'Owner account is protected' then raise; end if; end;
  begin
    update auth.users set banned_until=now()+interval '1 day' where id=owner_id;
    raise exception 'Owner banned';
  exception when raise_exception then if sqlerrm <> 'Owner account is protected' then raise; end if; end;
  begin
    update private.store_owner set user_id=staff_id;
    raise exception 'Ownership transferred';
  exception when raise_exception then if sqlerrm <> 'Store ownership is protected' then raise; end if; end;
end $$;
select set_config('request.jwt.claims', jsonb_build_object('sub',p.id,'role','authenticated')::text,true)
from public.profiles p where is_admin and not is_disabled and id <> public.store_owner_id() limit 1;
set local role authenticated;
do $$
begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'Staff can enumerate profiles'; end if;
  insert into public.products(name,slug,active) values('Rollback-only product QA','owner-rollback-product-qa',true);
end $$;
rollback;
select 'Owner protections and staff product publishing passed; all test writes rolled back' as result;
