-- TaskFlow v3: profiles (email digest settings) and manual task ordering.
-- Additive and safe to re-run. Run once in the Supabase SQL editor (after 0002).

-- Manual order: smaller comes first. Null means "use the default order".
alter table public.todos
  add column if not exists sort_order double precision;

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(trim(display_name)) between 1 and 60),
  email_digest_enabled boolean not null default false,
  -- Local wall-clock time the morning email should arrive, in the user's own timezone.
  email_digest_time time not null default '08:00',
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  -- Local date of the last digest sent, so it goes out at most once a day.
  last_digest_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.profiles_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.profiles_touch();

alter table public.profiles enable row level security;

drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;

create policy "own profile select" on public.profiles for select using (user_id = auth.uid());
create policy "own profile insert" on public.profiles for insert with check (user_id = auth.uid());
create policy "own profile update" on public.profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lets the daily job find who to email without scanning everyone.
create index if not exists profiles_digest_idx on public.profiles (email_digest_enabled)
  where email_digest_enabled;
