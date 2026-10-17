# 02 – Architecture

## 1. System overview

```
 ┌──────────────┐   HTTPS    ┌───────────────────────┐   HTTPS (PostgREST/Auth)   ┌────────────────────────┐
 │ Phone / PC   │ ─────────► │ Vercel (Next.js app)  │ ─────────────────────────► │ Supabase               │
 │ Browser/PWA  │ ◄───────── │ static + server comps │ ◄───────────────────────── │  - Auth (JWT)          │
 └──────────────┘            └───────────────────────┘                            │  - Postgres + RLS      │
        │                                                                          └────────────────────────┘
        └── Client also calls Supabase directly (supabase-js) using the user's JWT; RLS enforces ownership.
```

Design choice: **no custom backend API**. The browser talks to Supabase with the user's JWT; Row Level Security is the authorization layer. Next.js provides UI, routing, and session refresh middleware. This minimizes code and attack surface.

## 2. Layers

| Layer | Responsibility | Tech |
|-------|----------------|------|
| Presentation | Pages, components, styling, accessibility | React 18/19, Tailwind |
| State/data | Fetch, cache, optimistic updates | TanStack Query |
| Domain | Types, validation, sorting, palette | TypeScript, zod |
| Data access | CRUD wrappers over Supabase | `src/lib/todos.ts` |
| Auth | Session, route protection | `@supabase/ssr`, `middleware.ts` |
| Storage | Table, constraints, RLS, triggers | Postgres |
| Delivery | Hosting, CDN, TLS, PWA | Vercel, manifest + SW |

## 3. Folder structure

```
taskflow/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # html shell, providers, manifest link, fonts
│  │  ├─ page.tsx                # protected: TodoApp
│  │  ├─ login/page.tsx          # login/signup form
│  │  ├─ auth/callback/route.ts  # magic link / email confirm exchange
│  │  ├─ globals.css
│  │  └─ manifest.ts             # PWA manifest (Next metadata route)
│  ├─ components/
│  │  ├─ TodoApp.tsx             # client root: filters + list + composer
│  │  ├─ TodoList.tsx
│  │  ├─ TodoRow.tsx
│  │  ├─ PriorityBadge.tsx
│  │  ├─ PriorityPicker.tsx
│  │  ├─ ColorPicker.tsx         # reused for text + highlight
│  │  ├─ Composer.tsx            # bottom add bar
│  │  ├─ EditSheet.tsx           # bottom sheet editor
│  │  ├─ FilterBar.tsx
│  │  ├─ Toast.tsx
│  │  └─ Header.tsx
│  ├─ lib/
│  │  ├─ supabase/{client.ts,server.ts,middleware.ts}
│  │  ├─ todos.ts                # list/create/update/delete
│  │  ├─ queries.ts              # TanStack hooks (useTodos, useToggle, ...)
│  │  ├─ schema.ts               # zod schemas
│  │  ├─ palette.ts              # color keys -> classes + contrast table
│  │  ├─ sort.ts                 # comparator
│  │  └─ types.ts
│  └─ middleware.ts
├─ public/{icons/*.png, sw.js}
├─ supabase/migrations/0001_init.sql
├─ tests/{unit,component}  e2e/
├─ .env.example
└─ docs/
```

## 4. Data model

Table `public.todos`:

```sql
create table public.todos (
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
create index todos_user_sort_idx on public.todos (user_id, completed, priority, created_at desc);
```

`null` means default text color / no highlight (so "default" and "none" are never stored).

Trigger keeps `updated_at` current and `completed_at` consistent:

```sql
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
create trigger todos_before_write before insert or update on public.todos
for each row execute function public.todos_before_write();
```

## 5. Security model

```sql
alter table public.todos enable row level security;
create policy "own select" on public.todos for select using (user_id = auth.uid());
create policy "own insert" on public.todos for insert with check (user_id = auth.uid());
create policy "own update" on public.todos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own delete" on public.todos for delete using (user_id = auth.uid());
```

- Only the **anon key** ships to the browser (safe because of RLS). The **service-role key is never used**.
- `middleware.ts` refreshes the session cookie and redirects unauthenticated users to `/login`.
- Inputs validated by zod in the client before sending, and by DB CHECK constraints as the source of truth.
- React escapes output; never use `dangerouslySetInnerHTML`.
- Security headers via `next.config.ts` (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`).

## 6. Data flow

**Load:** `page.tsx` (server) checks session → renders `TodoApp` → `useTodos()` fetches `select * from todos` (RLS filters to owner) → sorted client-side with `sort.ts`.

**Toggle complete (optimistic):**
1. `useMutation.onMutate`: cancel queries, snapshot cache, flip `completed` locally.
2. `update todos set completed = $1 where id = $2`.
3. `onError`: restore snapshot + toast. `onSettled`: invalidate `['todos']`.

Same pattern for create (temporary client id replaced on settle), update, delete (with Undo toast delaying actual delete 5 s, or re-insert on undo).

## 7. Palette module (`src/lib/palette.ts`)

Single source of truth mapping keys to Tailwind classes. Must be written as **complete literal class strings** (Tailwind cannot see dynamically built names).

```ts
export const TEXT_COLORS = {
  red:    'text-red-700 dark:text-red-300',
  orange: 'text-orange-700 dark:text-orange-300',
  amber:  'text-amber-800 dark:text-amber-300',
  green:  'text-green-700 dark:text-green-300',
  teal:   'text-teal-700 dark:text-teal-300',
  blue:   'text-blue-700 dark:text-blue-300',
  purple: 'text-purple-700 dark:text-purple-300',
  pink:   'text-pink-700 dark:text-pink-300',
} as const;

export const HIGHLIGHT_COLORS = {
  yellow: 'bg-yellow-200 dark:bg-yellow-500/30',
  green:  'bg-green-200 dark:bg-green-500/30',
  blue:   'bg-blue-200 dark:bg-blue-500/30',
  pink:   'bg-pink-200 dark:bg-pink-500/30',
  orange: 'bg-orange-200 dark:bg-orange-500/30',
  purple: 'bg-purple-200 dark:bg-purple-500/30',
} as const;

export const PRIORITY_STYLES = {
  0: { label: 'P0', cls: 'bg-red-600 text-white' },
  1: { label: 'P1', cls: 'bg-orange-500 text-white' },
  2: { label: 'P2', cls: 'bg-amber-400 text-black' },
  3: { label: 'P3', cls: 'bg-blue-500 text-white' },
  4: { label: 'P4', cls: 'bg-gray-400 text-black' },
} as const;
```

The highlight is applied to an inline `<span>` wrapping the title with `box-decoration-clone px-1 rounded` so multi-line wraps look like a marker. A unit test computes WCAG contrast for each text x highlight pair and disables failing pairs in the picker (`isReadable(text, highlight)`).

## 8. Component contracts

| Component | Props | Notes |
|-----------|-------|-------|
| `TodoRow` | `todo`, `onToggle`, `onOpen` | checkbox + span title + PriorityBadge; whole row min-h 56px |
| `PriorityBadge` | `priority`, `onClick?` | text label always visible |
| `ColorPicker` | `kind: 'text'\|'highlight'`, `value`, `onChange`, `disabledKeys?` | radio-group of swatches, `aria-label` per swatch |
| `Composer` | `onAdd({title, priority})` | sticky bottom, safe-area padding `pb-[env(safe-area-inset-bottom)]` |
| `EditSheet` | `todo`, `open`, `onSave`, `onDelete`, `onClose` | focus trap, Esc closes |
| `FilterBar` | `status`, `priority`, `onChange` | chips, horizontally scrollable |

## 9. PWA

- `app/manifest.ts`: name TaskFlow, short_name TaskFlow, `display: 'standalone'`, `start_url: '/'`, theme/background colors, icons 192, 512, and maskable 512.
- `public/sw.js`: minimal service worker caching the app shell (cache-first for static assets, network-first for navigation with offline fallback page). Registered from a client component in production only.
- iOS: `<meta name="apple-mobile-web-app-capable">`, `apple-touch-icon` 180px.

## 10. Error handling

Network/DB errors → toast with retry; auth expiry → redirect to `/login`; validation errors inline. Global `error.tsx` and `not-found.tsx`.

## 11. Observability

Vercel Analytics (optional) and Vercel logs. No third-party tracking.

## 12. Roadmap (future, not now)

Due dates + reminders, tags, drag reorder, search, realtime sync (Supabase Realtime), recurring tasks, share lists.
