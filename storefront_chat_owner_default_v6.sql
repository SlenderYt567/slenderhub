begin;
alter table public.chat_sessions alter column owner_id set default auth.uid();
notify pgrst, 'reload schema';
commit;
