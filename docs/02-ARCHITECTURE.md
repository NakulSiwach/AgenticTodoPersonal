# 02 – Architecture (as built)

This describes the code that is running in production today
(https://agentic-todo-personal.vercel.app). If code and this file disagree, the code wins:
fix this file in the same change.

## 1. System overview

```
                          ┌───────────────────────────────────────────────┐
 Phone / laptop browser   │ Vercel (Next.js 16, App Router)               │
 (installable PWA)  ────► │  src/proxy.ts      session refresh + redirect │
                          │  /, /profile       server pages (auth check)  │
                          │  /login            client page                │
                          │  /auth/callback    email-link code exchange   │
                          │  /api/digest/test  "send me a test email"     │
                          │  /api/cron/digest  morning email job          │
                          └───────┬───────────────────────────┬───────────┘
                                  │ anon key + user JWT        │ service-role key (server only)
       browser also talks         ▼                            ▼
       to Supabase directly ─► Supabase: Auth + Postgres (RLS on every table)
                                                               │
 GitHub Actions (every 15 min) ── GET /api/cron/digest ────────┘
   Authorization: Bearer CRON_SECRET          └──► Resend HTTP API ──► user's inbox
```

Key choices:
- **No custom CRUD API.** The browser reads and writes `todos` and `profiles` directly with
  `supabase-js` and the user's JWT. **Row Level Security is the authorization layer.**
- **Server code exists only where a secret is needed:** the email routes. Only
  `/api/cron/digest` uses the service-role key (bypasses RLS), and it authenticates the caller
  with `CRON_SECRET` first.
- **Optimistic UI everywhere.** Every tap updates the screen at once; the network catches up.

## 2. Routes

| Path | File | Type | Auth |
|------|------|------|------|
| `/` | `src/app/page.tsx` → `TodoApp` | Server component that renders a client app | Redirects to `/login` if no user |
| `/profile` | `src/app/profile/page.tsx` → `ProfileApp` | Same | Same |
| `/login` | `src/app/login/page.tsx` | Client component | Public; signed-in users are bounced to `/` |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Route handler | Public; exchanges an email-link `code` for a session |
| `/api/digest/test` | `src/app/api/digest/test/route.ts` | `POST` | Signed-in user (cookie). Uses the **anon** client, so RLS applies |
| `/api/cron/digest` | `src/app/api/cron/digest/route.ts` | `GET` | `Authorization: Bearer $CRON_SECRET` (constant-time compare). Public in the proxy |
| `/manifest.webmanifest`, `/icon.png`, `/apple-icon.png` | `src/app/manifest.ts`, `src/app/*.png` | Metadata routes | Public |
| `/sw.js`, `/offline.html`, `/icons/*` | `public/` | Static | Public |

`src/proxy.ts` (Next 16's name for middleware) runs on every non-static request:
it refreshes the Supabase session cookie and redirects anonymous users to `/login`.
Public prefixes live in `PUBLIC_PREFIXES` in `src/lib/supabase/proxy.ts`
(`/login`, `/auth`, `/api/cron`). **A new public route must be added there**, or it will
redirect to `/login`.

## 3. Folder map

```
src/
  proxy.ts                     session refresh + auth redirect (matcher skips static/PWA files)
  app/
    layout.tsx                 <html>, theme init script (no dark-mode flash), Providers
    globals.css                Tailwind v4 import, `dark` class variant, animations
    page.tsx                   / (tasks)            profile/page.tsx   /profile
    login/page.tsx             sign in / create account (email + password)
    auth/callback/route.ts     code → session
    api/digest/test/route.ts   test email for the signed-in user
    api/cron/digest/route.ts   scheduled morning digest for everyone due
    manifest.ts error.tsx not-found.tsx icon.png apple-icon.png
  components/
    Providers.tsx              QueryClient + ToastProvider + service-worker registration
    TodoApp.tsx                tasks screen: state (view/sort/filter/search), wiring, shortcuts, delete+undo
    Sidebar.tsx                views, lists, tags with counts
    Toolbar.tsx                title, progress bar, search, sort + priority filter, menu button, TopActions
    Composer.tsx               add bar: quick-add text, chips for date/list/tags/priority
    TodoList.tsx               grouped sections, completed section, drag-and-drop (dnd-kit)
    TodoRow.tsx                one task: checkbox (priority ring), title with colors, meta, badge
    EditSheet.tsx              edit everything: title, notes, due, repeat, list, tags, subtasks, priority, colors
    Dropdown.tsx               custom <select> replacement (portal, flips up near the bottom)
    ColorPicker.tsx PriorityPicker.tsx PriorityBadge.tsx
    Toast.tsx                  toasts with optional action (Undo)
    ProfileApp.tsx             /profile: header card + tabs
    CalendarView.tsx           month grid, done/pending/overdue, per-day list
    NotificationSettings.tsx   digest on/off, time, timezone, "send test email"
    AccountSettings.tsx        display name
    ProfileMenu.tsx            avatar menu (Tasks, Profile, Sign out) + TopActions (theme + avatar)
    ThemeToggle.tsx            system / light / dark
  lib/
    types.ts                   all domain types and enum key lists (single source of truth)
    schema.ts                  zod schemas mirroring the DB CHECK constraints
    todos.ts                   CRUD over supabase-js; normalizeTodo(); friendly "run migration" errors
    queries.ts                 TanStack Query hooks with optimistic updates (see §6)
    profile.ts                 profile fetch/save (upsert) + hooks; browserTimezone()
    views.ts                   which tasks belong to a view, grouping, sorting, sidebar counts
    order.ts                   manual ordering math (sort_order midpoints)
    sort.ts                    base comparator (incomplete → priority → newest)
    quickadd.ts                parser for "tomorrow !1 #list @tag every week"
    dates.ts                   local-date helpers, repeat stepping, timezone clock
    calendar.ts                month grid + stats for the calendar tab
    digest.ts                  email subject/HTML/text builder + "is it time to send?" rule
    email.ts                   Resend HTTP call; appBaseUrl()
    palette.ts                 color keys → Tailwind classes, contrast check, priority styles
    options.ts                 dropdown options, quick tag suggestions
    theme.ts                   theme persistence + pre-paint script
    useToday.ts                local "today" that updates past midnight
    supabase/client.ts         browser client (singleton, anon key)
    supabase/server.ts         server-component client (cookies)
    supabase/proxy.ts          proxy session logic + PUBLIC_PREFIXES
    supabase/admin.ts          SERVICE-ROLE client: server only, cron route only
supabase/migrations/           0001_init, 0002_features, 0003_profile_and_order (apply in order)
scripts/                       gen-icons.mjs (PWA icons), rls-check.mjs (two-account security test)
public/                        sw.js, offline.html, icons/
tests/unit, tests/component    Vitest (+ Testing Library)        e2e/   Playwright
.github/workflows/             ci.yml (lint/typecheck/test/build), daily-digest.yml (cron trigger)
```

## 4. Data model

Migrations are **additive and re-runnable** (`if not exists`, `drop policy if exists`).
They are applied by hand in the Supabase SQL editor, in order. There is no migration runner.

### `public.todos`

| Column | Type | Rule | Added in |
|--------|------|------|----------|
| `id` | uuid PK | **generated on the client** (`crypto.randomUUID()`), DB default as fallback | 0001 |
| `user_id` | uuid | default `auth.uid()`, FK `auth.users` on delete cascade | 0001 |
| `title` | text | trimmed length 1–200 | 0001 |
| `notes` | text null | ≤ 2000 | 0001 |
| `priority` | smallint | 0–4 (P0 most urgent), default 2 | 0001 |
| `completed` | bool | default false | 0001 |
| `completed_at` | timestamptz null | **set/cleared by trigger** `todos_before_write` | 0001 |
| `text_color` | text null | one of `red orange amber green teal blue purple pink` | 0001 |
| `highlight_color` | text null | one of `yellow green blue pink orange purple` | 0001 |
| `created_at`, `updated_at` | timestamptz | `updated_at` set by trigger | 0001 |
| `due_date` | date null | local calendar date | 0002 |
| `list_name` | text null | 1–40 chars; null = Inbox. Lists are just distinct values, no table | 0002 |
| `tags` | text[] | ≤ 10, default `{}` | 0002 |
| `subtasks` | jsonb | array of `{id, title, done}`, ≤ 50 (zod) | 0002 |
| `repeat` | text null | `daily weekdays weekly monthly yearly` | 0002 |
| `sort_order` | double precision null | manual position; null = default order | 0003 |

Indexes: `(user_id, completed, priority, created_at desc)`, `(user_id, due_date) where not completed`.

### `public.profiles` (0003)

One row per user, created lazily by **upsert** the first time settings are saved
(the client must cope with no row: `DEFAULT_PROFILE`).

| Column | Notes |
|--------|-------|
| `user_id` PK | default `auth.uid()` |
| `display_name` | 1–60 chars or null |
| `email_digest_enabled` | default false |
| `email_digest_time` | `time`, local wall-clock (Postgres returns `08:00:00`; UI uses `08:00`) |
| `timezone` | IANA name from the browser, e.g. `Asia/Calcutta` |
| `last_digest_date` | local date of the last digest sent (once-a-day guard) |

### Row Level Security

Both tables: RLS on; `select/insert/update/delete` (profiles: no delete) only where
`user_id = auth.uid()`. Verified by `scripts/rls-check.mjs` (user B cannot read, update,
delete, or spoof rows of user A) and by DB rejecting invalid enums.

### Keeping the layers in sync

Each enum or limit exists in **three places**, and all three must change together:
1. SQL `CHECK` in a **new** migration file (never edit an applied one).
2. `src/lib/types.ts` key arrays (`TEXT_COLOR_KEYS`, `REPEATS`, …).
3. `src/lib/schema.ts` zod schema.

Plus `normalizeTodo()` in `todos.ts` for any new column (gives a default when an older row or
an un-migrated database lacks it), and the optimistic builder in `queries.ts`.

## 5. Auth flow

1. `/login`: `signInWithPassword` or `signUp` (email confirmation is **off** in Supabase, so
   sign-up returns a session immediately). On success: `router.replace("/")` + `refresh()`.
2. Session lives in cookies managed by `@supabase/ssr`. `proxy.ts` refreshes them on each request.
3. Server pages call `supabase.auth.getUser()` and `redirect("/login")` if absent.
4. Sign out (`ProfileMenu`): `auth.signOut()`, clear the query cache, go to `/login`.
5. `/auth/callback` exists for email links (confirmation / future password reset). Those links
   need the site URL listed in Supabase → Authentication → URL Configuration.

## 6. Client data flow (the important part)

All task data is one TanStack Query cache entry, key `["todos"]`, loaded by `listTodos()`
(`select *` ordered by `created_at desc`; RLS limits it to the owner). Every screen derives what
it shows from that array (§7). Profile data is a second entry, `["profile"]`.

`src/lib/queries.ts` exports `useCreateTodo`, `useUpdateTodo`, `useDeleteTodo`. Each returns
`{ ...mutation, mutate }` where `mutate` is a wrapper that:

1. **Snapshots** the cache (`prev`) and **applies the optimistic change synchronously** inside the
   tap handler. This matters: a controlled checkbox would visibly snap back for a frame if the
   update landed a tick later.
2. Calls the real mutation with `{ ...vars, prev }`.
3. `onMutate`: `await cancelQueries` (so an in-flight list fetch can't overwrite the change), then
   re-applies the same change (idempotent).
4. `onSuccess`: `adopt(savedRow)` swaps in the server's row (real timestamps) **without
   refetching** the list. Skipped while other writes are still in flight, so a late reply can't
   undo a newer tap.
5. `onError`: restore `prev`, show a toast, and refetch to resync.

Two more rules:
- **Client-generated ids.** A new task's UUID is made in the browser, so the optimistic row and
  the saved row are the same React key. No temporary ids, no remounts.
- **Writes wait for their insert.** `pendingCreates` maps id → insert promise. Update and delete
  `await afterCreate(id)` first, so tapping a just-added task can't hit a row the server hasn't
  stored yet.

Behaviours built on top (in `TodoApp.tsx`):
- **Delete with undo.** The row is hidden locally (`pendingDelete` set) for 5 s; only then is
  `remove.mutate` called. Undo just cancels the timer. Closing the tab inside 5 s keeps the task.
- **Completing a repeating task** with a due date does **not** complete it: it moves `due_date` to
  `nextOccurrence()` (always after today) and offers Undo.
- **Clear completed** (Completed view) deletes all finished tasks after a confirm.

Errors: `todos.ts`/`profile.ts` translate "column does not exist / schema cache" into
"Database needs the latest update: run supabase/migrations/000X_….sql".

## 7. Views, grouping, sorting (`src/lib/views.ts`)

A **view** is a string: `inbox | today | upcoming | all | completed | list:<name> | tag:<name>`.
`inView(todo, view, today)` decides membership:

| View | Contains |
|------|----------|
| inbox | `list_name === null` |
| today | open tasks with `due_date <= today` (includes overdue) + tasks completed today |
| upcoming | open tasks with `due_date > today` (completed section hidden) |
| all | everything |
| completed | completed tasks |
| list:X / tag:X | case-insensitive match on `list_name` / `tags` |

Pipeline in `TodoApp`: all tasks → minus `pendingDelete` → `inView` (or **all tasks** when a
search is active) → `applyFilters(priority, search)` → split open/done →
`groupOpen(open, sort, today)` and `sortDone(done)` (newest finished first).

Search (`matchesSearch`) looks in title, notes, list, tags and subtask titles.

Sorts (`SortKey`), chosen in the Toolbar:

| Key | Behaviour |
|-----|-----------|
| `priority` (default) | P0 first, then manual position, then newest (`byPriorityThenOrder`) |
| `manual` | manual position only (`byOrder`) |
| `smart` | sections Overdue / Today / Tomorrow / weekday names / Later / No date; priority order inside |
| `due` | due date ascending, undated last |
| `newest` | created_at desc |
| `alpha` | title A→Z, case-insensitive |

`countViews()` feeds the sidebar badges; lists and tags are discovered from task data (keep the
casing of their first occurrence). `todayProgress()` drives the progress bar on Today.

## 8. Manual ordering (`src/lib/order.ts`)

- `effectiveOrder(t) = t.sort_order ?? -created_at_seconds`. Undragged tasks therefore sit on the
  same number line as "newest first", so dragged and undragged tasks mix and **a drop writes
  exactly one row**.
- `orderAfterMove(list, activeId, overId)` returns the midpoint between the new neighbours (or ±1
  at the ends).
- Dragging is enabled only for sort `priority` or `manual`, not in Completed, not while searching.
  In `priority` sort, moving across priorities is refused with a toast.
- dnd-kit: pointer sensor with 5 px activation distance (so taps still click), keyboard sensor for
  accessibility; each row gets a "Reorder: <title>" handle.

## 9. Quick-add grammar (`src/lib/quickadd.ts`)

Typed into the Composer; tokens are removed from the title:

| Token | Effect |
|-------|--------|
| `today`, `tonight`, `tomorrow`/`tmrw`/`tmr`, `next week`, `in 3 days`, `in 2 weeks`, `friday`, `on friday`, `next friday` | `due_date` |
| `every day/weekday/week/month/year`, `every monday` | `repeat` (+ due date for weekdays) |
| `!0`–`!4` or `p0`–`p4` | `priority` |
| `#Name` | `list_name` |
| `@tag` (repeatable, ≤ 10) | `tags` |

If nothing is left after removing tokens, the raw text becomes the title. Composer chips (date,
list, tags, priority) set the same fields without typing. The Today view pre-fills today's date;
a list view pre-fills that list.

## 10. Dates and time zones (`src/lib/dates.ts`)

- Due dates are **local calendar dates** (`YYYY-MM-DD`), never UTC. `toISODate()` uses the
  browser's local fields. `useToday()` re-reads the date every minute and on tab focus.
- `nextOccurrence(due, repeat, today)` steps until strictly after today. Monthly clamps to the
  month's last day (31 Jan → 28/29 Feb).
- Server side, `localClock(now, timezone)` gives a user's wall-clock date and minutes using
  `Intl` (falls back to UTC for unknown zones).

## 11. Daily email digest

Pieces: `profiles` settings, `lib/digest.ts` (pure, unit-tested), `lib/email.ts` (Resend),
`/api/cron/digest`, `/api/digest/test`, `.github/workflows/daily-digest.yml`.

**Scheduler.** GitHub Actions runs every 15 minutes (`*/15 * * * *`) and calls
`GET $APP_URL/api/cron/digest` with `Authorization: Bearer $CRON_SECRET`. (Vercel Hobby cron
runs at most daily, so it can't honour per-user times.) If the GitHub secrets are missing the
step exits 0 with a notice. GitHub disables scheduled workflows after 60 days without repo
activity, and runs can be delayed during busy periods.

**Cron route** (`/api/cron/digest`), per profile with digest enabled:
1. `shouldSendDigest()`: enabled, not yet sent for the user's **local** date, and local time is
   between the chosen time and +180 min (`SEND_WINDOW_MINUTES`, tolerates late runs).
2. **Claim** the day atomically: `update last_digest_date = today where last_digest_date is null or
   != today`. If no row came back, another run got it. This prevents double emails.
3. Read the user's email (`auth.admin.getUserById`) and their open tasks with `due_date <= today`.
4. No tasks → stay quiet (counted as skipped). Otherwise `buildDigest()` → `sendEmail()`.
5. On any failure, **release** the claim (restore the old date) so the next run retries.
6. Responds `{checked, sent, skipped, failed}`.

**Test route** (`/api/digest/test`): signed-in user only, uses their own RLS-scoped client and the
browser's timezone, always sends (even with zero tasks), subject prefixed `[Test]`. Errors are
returned as `{error}` and shown in red on the Profile page.

**Email content** (`buildDigest`): grouped by priority (P0 first), then oldest due date; shows
overdue labels, list, tags, subtask progress; links to the app and to `/profile`. All user text
goes through `escapeHtml`. Table layout + inline styles for email clients; fixed English date
format (server locale independent).

**Sending** (`sendEmail`): plain `fetch` to `https://api.resend.com/emails` (no SDK).
`EMAIL_FROM` defaults to `TaskFlow <onboarding@resend.dev>`, which **only delivers to the email
the Resend account was created with** until a domain is verified in Resend.

## 12. UI system

- **Layout:** sidebar is fixed at `md` (≥ 768 px) and becomes a slide-in dialog on phones.
  Content column `max-w-3xl`. Composer stays visible; phone bottom padding leaves room for it.
  Safe-area insets respected (`env(safe-area-inset-*)`). Touch targets ≥ 44 px (`min-h-11`).
- **Theme:** Tailwind v4 with `@custom-variant dark (&:where(.dark, .dark *))`, so dark mode is a
  class on `<html>`. `THEME_INIT_SCRIPT` runs in `<head>` before paint (no flash); choice
  `system|light|dark` is stored in `localStorage["theme"]`.
- **Colors:** only through `src/lib/palette.ts`. Tailwind classes must be written as complete
  literal strings (Tailwind scans source text; built-up names are not generated).
  `isReadable(text, highlight)` checks WCAG 4.5:1 in light and dark; unreadable combinations are
  disabled in the pickers. Checkbox ring color = priority (`PRIORITY_RING`).
- **Dropdowns:** use `Dropdown.tsx` (portal, fixed position, flips upward near the bottom,
  keyboard navigable, Escape doesn't close the parent sheet), not native `<select>`. The row
  priority badge still uses a transparent native select overlay.
- **Shortcuts:** `n`/`q` focus the composer, `/` focuses search, `Esc` closes menus/sheets.
  Ignored while typing.
- **Accessibility:** labelled inputs, `role=dialog` + `aria-modal` sheets with focus handling,
  colour never the only signal (priority also shown as text), `prefers-reduced-motion` honoured.

## 13. PWA

`app/manifest.ts` (standalone, indigo theme, 192/512/maskable icons from `scripts/gen-icons.mjs`),
iOS meta via `metadata.appleWebApp`, `public/sw.js` registered in production only
(`Providers.tsx`). The service worker caches `/_next/static/*` and `/icons/*` (cache-first) and
serves `offline.html` when a navigation fails. **Task data is never cached by the SW.** After a
deploy, the first load may show old static files; a second load picks up the new ones. Bump
`VERSION` in `sw.js` when changing its caching logic.

## 14. Security summary

| Concern | Control |
|---------|---------|
| Data isolation | RLS on `todos` and `profiles`; anon key only in the browser |
| Service-role key | `SUPABASE_SERVICE_ROLE_KEY`, server env only, used only in `lib/supabase/admin.ts` from the cron route |
| Cron endpoint | `CRON_SECRET` bearer check with `timingSafeEqual`; 503 if unset |
| Input | zod on the client + DB CHECK constraints as the source of truth |
| XSS | React escaping; email HTML built with `escapeHtml`; no user HTML rendered |
| Headers | `next.config.ts`: nosniff, `X-Frame-Options: DENY`, referrer policy, permissions policy; Vercel adds HSTS |
| Secrets in git | `.env*` ignored except `.env.example` |

## 15. Environment variables

| Name | Where | Used by | Required |
|------|-------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (Prod+Preview), `.env.local` | everything | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | browser + server clients | yes |
| `NEXT_PUBLIC_SITE_URL` | same | links inside emails (`appBaseUrl`) | recommended |
| `RESEND_API_KEY` | Vercel (Prod), `.env.local` | `email.ts`. Starts with `re_` | for email |
| `EMAIL_FROM` | optional | sender; needs a verified Resend domain | no |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (Prod), `.env.local` | cron route only. A Supabase `eyJ…` (or `sb_secret_…`) key | for email |
| `CRON_SECRET` | Vercel (Prod) **and** GitHub secret | cron auth; must be identical in both | for email |
| `APP_URL` | GitHub secret | workflow target, no trailing slash | for email |
| `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_BASE_URL` | shell only | Playwright | for e2e |

Vercel only applies changed variables on a **new deployment**.
