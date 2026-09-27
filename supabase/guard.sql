-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
--
-- 1. Guard: the app refuses to save from a page that is out of date, but a page
--    still running old code doesn't know to check. This makes the database
--    refuse too: a save must say which version it replaces (prevUpdatedAt), and
--    that must be the version stored now. Only applies to saves from the app;
--    edits made here in the SQL editor are let through.
-- 2. History: before a save replaces the data, keep a copy, at most one an hour,
--    for 30 days. Not readable from the app; restore from here (see bottom).

create table if not exists lifeos_history (
  id       bigserial primary key,
  user_id  text not null,
  data     jsonb not null,
  saved_at timestamptz not null default now()
);
create index if not exists lifeos_history_user_time on lifeos_history (user_id, saved_at desc);
alter table lifeos_history enable row level security;   -- no policies: the app can't read or write it

create or replace function lifeos_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- request.jwt.claims is only set for requests through the API, i.e. from the app.
  if nullif(current_setting('request.jwt.claims', true), '') is not null
     and (old.data ? 'updatedAt')
     and (new.data->>'prevUpdatedAt') is distinct from (old.data->>'updatedAt') then
    raise exception 'stale: another device saved newer data';
  end if;

  if not exists (select 1 from lifeos_history
                 where user_id = old.user_id::text and saved_at > now() - interval '1 hour') then
    insert into lifeos_history (user_id, data) values (old.user_id::text, old.data);
  end if;
  delete from lifeos_history where saved_at < now() - interval '30 days';
  return new;
end $$;

drop trigger if exists lifeos_guard on lifeos_state;
create trigger lifeos_guard before update on lifeos_state
  for each row execute function lifeos_guard();

-- To see saved copies:
--   select id, saved_at, (select count(*) from jsonb_object_keys(data->'days')) as days_logged
--   from lifeos_history order by saved_at desc;
-- To restore one (then reload the app on every device):
--   update lifeos_state set data = (select data from lifeos_history where id = <id>)
--     || jsonb_build_object('updatedAt', now()::text)
--   where user_id = 'solo';
