-- Browser-created orders remain pending. Stripe orders are server-created.
-- This preserves the manual Pix/crypto checkout and admin UPDATE policy.
begin;
alter policy chat_sessions_insert_owner on public.chat_sessions
  with check (
    owner_id = (select auth.uid())
    and payment_status = 'pending'
    and status = 'pending_payment'
    and delivery_status = 'pending'
    and verified_at is null
    and left(id, 3) <> 'cs_'
    and lower(coalesce(payment_method, '')) not like '%stripe%'
  );
commit;
