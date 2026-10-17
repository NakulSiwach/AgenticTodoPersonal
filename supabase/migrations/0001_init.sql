-- TaskFlow initial schema. Run once in the Supabase SQL editor.

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  notes text check (notes is null or char_length(notes) <= 2000),
  priority smallint not null default 2 check (priority between 0 and 4),
  completed boolean not null default false,
  completed_at timestamptz,
  text_color text check (text_color is null or text_color in
    ('red','orange','amber','green','teal','blue','purple','pink')),
  highlight_color text check (highlight_color is null or highlight_color in
    ('yellow','green','blue','pink','orange','purple')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todos_user_sort_idx
  on public.todos (user_id, completed, priority, created_at desc);

create or replace function public.todos_before_write() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  if new.completed and (tg_op = 'INSERT' or not old.completed) then
    new.completed_at = now();
  elsif not new.completed then
    new.completed_at = null;
  end if;
  return new;
end $$;

drop trigger if exists todos_before_write on public.todos;
create trigger todos_before_write before insert or update on public.todos
for each row execute function public.todos_before_write();

-- Row Level Security: each user only ever sees and changes their own rows.
alter table public.todos enable row level security;

drop policy if exists "own select" on public.todos;
drop policy if exists "own insert" on public.todos;
drop policy if exists "own update" on public.todos;
drop policy if exists "own delete" on public.todos;

create policy "own select" on public.todos for select using (user_id = auth.uid());
create policy "own insert" on public.todos for insert with check (user_id = auth.uid());
create policy "own update" on public.todos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own delete" on public.todos for delete using (user_id = auth.uid());
