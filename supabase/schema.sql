-- Run this in Supabase: SQL Editor > New query > paste > Run

create table if not exists lifeos_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table lifeos_state enable row level security;

-- Each person can only ever touch their own row.
drop policy if exists "own row" on lifeos_state;
create policy "own row" on lifeos_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists lifeos_touch on lifeos_state;
create trigger lifeos_touch before update on lifeos_state
  for each row execute function touch_updated_at();
