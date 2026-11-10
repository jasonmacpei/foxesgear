create or replace function public.reserve_invitation_email(actor_id uuid,target_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare recipient_profile public.profiles; reservation uuid:=gen_random_uuid();
begin
  if not exists(select 1 from private.store_owner o join public.profiles p on p.id=o.user_id
    where o.user_id=actor_id and p.is_admin and not p.is_disabled) then raise exception 'Owner required'; end if;
  select * into recipient_profile from public.profiles where id=target_id for update;
  if not found or recipient_profile.is_disabled then raise exception 'User unavailable'; end if;
  if recipient_profile.invitation_attempted_at>now()-interval '60 seconds' then raise exception 'Please wait one minute before resending'; end if;
  update public.profiles set invitation_attempt_id=reservation,invitation_attempted_at=now(),invitation_email_status='sending' where id=target_id;
  return reservation;
end;
$$;
revoke all on function public.reserve_invitation_email(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_invitation_email(uuid,uuid) to service_role;

