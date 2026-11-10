begin;
do $$
declare owner_id uuid:=public.store_owner_id(); target uuid:=gen_random_uuid(); token uuid:=gen_random_uuid(); first_claim record; retry_claim record; n int;
begin
  perform public.authorize_user_invitation(owner_id,'account-email-qa@example.invalid',token);
  insert into auth.users(id,email,raw_user_meta_data) values(target,'account-email-qa@example.invalid',jsonb_build_object('owner_invitation_token',token::text,'full_name','Rollback-only email QA'));
  perform public.reserve_invitation_email(owner_id,target);
  begin
    perform public.reserve_invitation_email(owner_id,target);
    raise exception 'Resend cooldown bypassed';
  exception when raise_exception then if sqlerrm<>'Please wait one minute before resending' then raise; end if; end;
  update auth.users set encrypted_password='rollback-only-hash' where id=target;
  if not exists(select 1 from public.profiles where id=target and setup_complete and setup_completed_at is not null) then raise exception 'Setup not recorded'; end if;
  update auth.users set encrypted_password='rollback-only-password-reset-hash' where id=target;
  if (select count(*) from private.signup_email_outbox where user_id=target)<>1 then raise exception 'Duplicate signup event'; end if;
  select * into first_claim from public.claim_signup_emails(target);
  if first_claim.id is null then raise exception 'Queue claim failed'; end if;
  select count(*) into n from public.claim_signup_emails(target);
  if n<>0 then raise exception 'Concurrent notification claim permitted'; end if;
  perform public.finish_signup_email(first_claim.id,first_claim.claim_id,null,'Test outage');
  select * into retry_claim from public.claim_signup_emails(target);
  if retry_claim.id<>first_claim.id or retry_claim.claim_id=first_claim.claim_id then raise exception 'Retry claim invalid'; end if;
  perform public.finish_signup_email(retry_claim.id,retry_claim.claim_id,'test-provider-id',null);
  select count(*) into n from public.claim_signup_emails(target);
  if n<>0 then raise exception 'Sent notification reclaimed'; end if;
end $$;
rollback;
select 'Invitation cooldown, first setup, duplicate suppression, queue leasing and retry passed; writes rolled back' as result;
