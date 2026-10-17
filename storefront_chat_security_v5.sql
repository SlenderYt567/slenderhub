begin;

alter table public.chat_sessions add column if not exists owner_id uuid references auth.users(id) on delete set null;
create index if not exists chat_sessions_owner_id_idx on public.chat_sessions (owner_id, created_at desc);

drop policy if exists "Acesso total chat_sessions" on public.chat_sessions;
drop policy if exists "chat_sessions_select" on public.chat_sessions;
drop policy if exists "chat_sessions_insert" on public.chat_sessions;
drop policy if exists "chat_sessions_update" on public.chat_sessions;
create policy chat_sessions_read_owner_or_admin on public.chat_sessions for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy chat_sessions_insert_owner on public.chat_sessions for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy chat_sessions_update_admin on public.chat_sessions for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Acesso total chat_messages" on public.chat_messages;
create policy chat_messages_read_owner_or_admin on public.chat_messages for select to authenticated
  using (exists (
    select 1 from public.chat_sessions s where s.id = chat_id
    and (s.owner_id = (select auth.uid()) or (select public.is_admin()))
  ));
create policy chat_messages_insert_owner_or_admin on public.chat_messages for insert to authenticated
  with check (
    ((select public.is_admin()) and sender = 'admin')
    or (sender = 'user' and exists (
      select 1 from public.chat_sessions s where s.id = chat_id and s.owner_id = (select auth.uid())
    ))
  );

create or replace function public.touch_chat_last_message() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  update public.chat_sessions set last_message_at = new.timestamp where id = new.chat_id;
  return new;
end;
$$;
drop trigger if exists touch_chat_last_message on public.chat_messages;
create trigger touch_chat_last_message after insert on public.chat_messages
  for each row execute function public.touch_chat_last_message();

notify pgrst, 'reload schema';
commit;
