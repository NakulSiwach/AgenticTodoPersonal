-- TaskFlow: recurring reminders (sent in the daily email) and the daily quote setting.
-- Additive and safe to re-run. Run once in the Supabase SQL editor (after 0003).
-- Independent of 0004 (Google Calendar), so the two can be applied in either order.

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 200),
  -- daily | weekdays (Mon-Fri) | weekly (on days_of_week) | monthly (day of on_date)
  -- | yearly (month + day of on_date) | once (on on_date)
  schedule text not null
    check (schedule in ('daily','weekdays','weekly','monthly','yearly','once')),
  -- 0 = Sunday ... 6 = Saturday. Used by 'weekly'.
  days_of_week smallint[] not null default '{}'
    check (days_of_week <@ '{0,1,2,3,4,5,6}'::smallint[]),
  on_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_schedule_fields check (
    (schedule <> 'weekly' or cardinality(days_of_week) between 1 and 7)
    and (schedule not in ('monthly','yearly','once') or on_date is not null)
  )
);

create index if not exists reminders_user_idx on public.reminders (user_id);

create or replace function public.reminders_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists reminders_touch on public.reminders;
create trigger reminders_touch before update on public.reminders
for each row execute function public.reminders_touch();

alter table public.reminders enable row level security;

drop policy if exists "own reminders select" on public.reminders;
drop policy if exists "own reminders insert" on public.reminders;
drop policy if exists "own reminders update" on public.reminders;
drop policy if exists "own reminders delete" on public.reminders;

create policy "own reminders select" on public.reminders for select using (user_id = auth.uid());
create policy "own reminders insert" on public.reminders for insert with check (user_id = auth.uid());
create policy "own reminders update" on public.reminders for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own reminders delete" on public.reminders for delete using (user_id = auth.uid());

-- Quote of the day at the bottom of the daily email (on by default).
alter table public.profiles
  add column if not exists digest_quote_enabled boolean not null default true;
