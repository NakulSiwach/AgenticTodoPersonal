# 07 – Adding Features (playbook)

Recipes for the most common kinds of change. Read [02-ARCHITECTURE.md](02-ARCHITECTURE.md)
first; this file assumes you know the layers.

## 0. Before you start
1. `npm install`, make sure `.env.local` exists (see [05-DEPLOYMENT.md](05-DEPLOYMENT.md)).
2. Baseline must be green: `npm run typecheck && npm run lint && npm test`.
3. Next.js here is **16**: middleware is `src/proxy.ts`, and APIs may differ from older
   versions. Check `node_modules/next/dist/docs/` before using a Next API you're unsure about.

## 1. Add a field to a task (example: `estimate_minutes`)

Touch these, in this order:

| # | File | Change |
|---|------|--------|
| 1 | `supabase/migrations/0005_<name>.sql` | **New file.** `alter table public.todos add column if not exists estimate_minutes int check (estimate_minutes is null or estimate_minutes between 1 and 1440);` Re-runnable. Never edit 0001–0004 |
| 2 | `src/lib/types.ts` | Add to `Todo`, `NewTodo` (optional), and the `TodoPatch` pick list |
| 3 | `src/lib/schema.ts` | Add to `newTodoSchema` (`.optional()`) and `todoPatchSchema`. Same limits as the SQL CHECK |
| 4 | `src/lib/todos.ts` | Default it in `normalizeTodo()` (`row.estimate_minutes ?? null`). Update the migration hint in `fail()` to name the new file |
| 5 | `src/lib/queries.ts` | Set it in `buildOptimistic()` |
| 6 | UI | Edit control in `EditSheet.tsx` (include it in the `onSave` patch); display in `TodoRow.tsx`; optional Composer chip / quick-add token in `quickadd.ts` |
| 7 | Tests | Fixture factories in `tests/unit/sort.test.ts`, `views.test.ts`, `order.test.ts`, `calendar.test.ts`, `tests/component/TodoApp.test.tsx` and `ProfileApp.test.tsx` build full `Todo` objects, so add the field there. Add schema tests for limits |
| 8 | Digest (if it should appear in email) | `DigestTodo` + the `select(...)` column lists in **both** `api/cron/digest/route.ts` and `api/digest/test/route.ts` + `buildDigest` |
| 8b | Google Calendar (if it should appear on the event) | `SyncTodo` + `SYNC_COLUMNS` + `buildEvent` in `gcalEvents.ts`. Changing the event body changes every fingerprint, so the next sync rewrites all events once (capped at 120 per run) |
| 9 | Docs | Data model table in 02-ARCHITECTURE §4, feature list in 01-PRD |
| 10 | Human | Run the new migration in Supabase **before** deploying code that writes the column |

Deploy order: migration first, then code. Code reading a missing column fails with the friendly
"Database needs the latest update" message, so the order mistake is visible, not silent.

## 2. Change an enum (new color, new repeat rule, new priority)

Enums live in three places that must agree:
- SQL CHECK: new migration that drops and re-adds the constraint. Find its name with
  `select conname from pg_constraint where conrelid = 'public.todos'::regclass;`
- `types.ts` key array (`TEXT_COLOR_KEYS`, `HIGHLIGHT_COLOR_KEYS`, `REPEATS`, `PRIORITIES`)
- `schema.ts` (most use `z.enum(KEYS)`, so they follow automatically; `prioritySchema` is literal)

Then the per-key maps, which TypeScript will flag as incomplete:
- Colors: `TEXT_COLORS`, `TEXT_SWATCHES`, `HIGHLIGHT_COLORS`, and the hex tables used by
  `isReadable` in `palette.ts`. **Write full literal Tailwind class strings.**
- Repeat: `step()` in `dates.ts`, `REPEAT_LABELS`, the quick-add words in `quickadd.ts`, the
  options in `EditSheet.tsx`.
- Priority: `PRIORITY_STYLES`, `PRIORITY_RING`, `PRIORITY_DOT`, `PRIORITY_HINTS`, digest
  `PRIORITY_COLOR`, sidebar/filters. Changing the P0–P4 range is a large change; avoid it.

## 3. Add a view (example: "No date")
1. `views.ts`: add a case to `inView()`, a title in `viewTitle()`, and a counter in `countViews()`.
2. `Sidebar.tsx`: add the nav item with its count.
3. `TodoApp.tsx`: add an empty-state hint to `EMPTY_HINTS`; check Composer defaults if the view
   implies one (Today → today's date, list → that list).
4. Tests in `tests/unit/views.test.ts`.

## 4. Add a sort
`SortKey` in `types.ts` → a comparator in `SORTERS` (`views.ts`) → an option in `SORTS`
(`Toolbar.tsx`). Decide whether dragging is allowed (`canDrag` in `TodoApp.tsx`); dragging only
makes sense when the list order is driven by `sort_order`.

## 5. Add a user setting
Settings live in `profiles`, not in task rows.
1. Migration: `alter table public.profiles add column if not exists …` with a default.
2. `Profile` type (`types.ts`), `DEFAULT_PROFILE` + `profilePatchSchema` + `normalize()`
   (`profile.ts`).
3. UI in `NotificationSettings.tsx` / `AccountSettings.tsx`, or a new tab in `ProfileApp.tsx`
   (`TABS`). Save with `useSaveProfile().mutate(patch)`, which upserts.
4. If the cron job needs it, add it to `ProfileRow` in the cron route.

## 6. Add a server route / API
- Put it under `src/app/api/<name>/route.ts`.
- For user actions: use `createClient()` from `lib/supabase/server.ts` (user's cookies, RLS applies)
  and return 401 when `getUser()` has no user.
- For machine callers (webhooks, schedulers): add the path prefix to `PUBLIC_PREFIXES` in
  `lib/supabase/proxy.ts` and authenticate inside the route (shared secret, signature). Only these
  routes may use `createAdminClient()`. Never import `admin.ts` from a component.
- Return `Response.json({ error }, { status })` on failure; the UI shows `error` verbatim.
- New secrets: add to `.env.example` (blank), Vercel, the env table in 02-ARCHITECTURE §15 and
  05-DEPLOYMENT, and tell the user they must redeploy.

## 7. Add a scheduled job
Copy `.github/workflows/daily-digest.yml`: a cron trigger plus `workflow_dispatch`, `curl --fail`
with a bearer secret. Make the route **idempotent** (claim-then-act, like `last_digest_date`),
because GitHub runs can be late, skipped or doubled.

## 8. Add a UI component
- Client components start with `"use client"`. Keep server pages (`app/*/page.tsx`) thin: auth check, then
  render the client app.
- Colors only via `palette.ts`; dark variants with `dark:`; touch targets `min-h-11`/`size-11`.
- Use `Dropdown.tsx` for pickers, `useToast()` for feedback, `role="dialog"` + `aria-modal` +
  Escape for overlays.
- Give interactive elements accessible names. Tests and e2e select by role and label
  (e.g. `getByRole("button", { name: "Add", exact: true })`), so renaming a label can break tests.
- Check at 360 px, 768 px and 1280 px, in light and dark.

## 9. Writing data from new UI
Always go through the hooks in `queries.ts` (`useCreateTodo`, `useUpdateTodo`,
`useDeleteTodo`). They give instant UI, rollback and toasts. For a brand-new table, copy the same
pattern: sync optimistic apply in the `mutate` wrapper, cancel then re-apply in `onMutate`, adopt
the server row on success, restore + toast + refetch on error.

## 10. Definition of done for a feature
- [ ] Migration file (if any) is additive and re-runnable; user told to run it
- [ ] types + zod + SQL agree; `normalizeTodo`/`normalize` default the new field
- [ ] Unit tests for new logic in `src/lib`; component test for the main interaction
- [ ] `npm run typecheck && npm run lint && npm test` green; `npm run build` passes
- [ ] e2e still green (`npm run e2e` with `E2E_EMAIL`/`E2E_PASSWORD`), extended if the feature is core
- [ ] Works at phone width and in dark mode
- [ ] Docs updated: 01-PRD feature list, 02-ARCHITECTURE sections touched, DECISIONS.md for
      any judgement call, PROJECT_STATUS.md for anything the owner must do
- [ ] One commit per feature; push only at milestones (the owner asked for few pushes)
