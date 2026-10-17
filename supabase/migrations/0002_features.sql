-- TaskFlow v2: due dates, lists, tags, subtasks, repeat. Additive and safe to re-run.
-- Run once in the Supabase SQL editor (after 0001_init.sql).

alter table public.todos
  add column if not exists due_date date,
  add column if not exists list_name text
    check (list_name is null or char_length(trim(list_name)) between 1 and 40),
  add column if not exists tags text[] not null default '{}'
    check (cardinality(tags) <= 10),
  add column if not exists subtasks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(subtasks) = 'array'),
  add column if not exists repeat text
    check (repeat is null or repeat in ('daily','weekdays','weekly','monthly','yearly'));

create index if not exists todos_user_due_idx
  on public.todos (user_id, due_date) where completed = false;
