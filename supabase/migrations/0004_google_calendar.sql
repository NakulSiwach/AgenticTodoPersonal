-- TaskFlow v4: Google Calendar sync. Additive and safe to re-run.
-- Run once in the Supabase SQL editor (after 0003).

-- One row per user who connected Google Calendar. Holds an (encrypted) OAuth refresh token,
-- so the browser must never read it: RLS is on and there are deliberately NO policies for
-- anon/authenticated. Only the server (service-role key, after checking the signed-in user)
-- reads or writes this table, through the /api/gcal routes.
create table if not exists public.google_calendar_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  -- The secondary calendar TaskFlow created in the user's Google account.
  calendar_id text not null check (char_length(calendar_id) between 1 and 1024),
  -- AES-256-GCM ciphertext (key: GOOGLE_TOKEN_KEY on the server).
  refresh_token_enc text not null,
  last_synced_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.google_calendar_links_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists google_calendar_links_touch on public.google_calendar_links;
create trigger google_calendar_links_touch before update on public.google_calendar_links
for each row execute function public.google_calendar_links_touch();

alter table public.google_calendar_links enable row level security;
revoke all on public.google_calendar_links from anon, authenticated;
