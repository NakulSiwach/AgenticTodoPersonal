# AGENT_INSTRUCTIONS.md – For AI agents working on TaskFlow

TaskFlow is **built and live** (https://agentic-todo-personal.vercel.app). Your job is to
maintain it and add features without breaking what works. Pushing to `master` deploys to
production.

## 1. Read first (in order)
1. `README.md`: what the app is and where things are.
2. `docs/02-ARCHITECTURE.md`: how it works. The reference for everything below.
3. `docs/07-ADDING-FEATURES.md`: the recipe for the kind of change you're making.
4. `DECISIONS.md`: past judgement calls. Don't undo one without a reason.
5. `docs/06-TESTING-AND-QA.md` before writing tests.
6. `AGENTS.md`: Next.js 16 notice. Check `node_modules/next/dist/docs/` for Next APIs.

## 2. Rules that protect production
1. **Never put the service-role key in client code.** `src/lib/supabase/admin.ts` may only be
   imported by server route handlers that authenticate the caller themselves.
2. **RLS stays on.** Every new table gets RLS + `user_id = auth.uid()` policies in its migration.
   Extend `scripts/rls-check.mjs` for new tables. Exception: tables holding secrets
   (`google_calendar_links`) get RLS with **no** policies and are reached only via server routes.
   **`src/lib/google.ts` and `gcalRoute.ts` are server-only**, same as `admin.ts`.
3. **Migrations are new files, additive and re-runnable.** Never edit `0001`–`0004`. A human runs
   them in Supabase. Code that needs a column ships *after* its migration is applied.
4. **Keep SQL CHECK, `types.ts`, and `schema.ts` in agreement** for every enum and limit.
5. **Write through the hooks in `src/lib/queries.ts`.** Don't call `todos.ts` from components.
   The hooks provide instant UI, rollback, and the insert-before-update ordering.
6. **Tailwind classes as complete literal strings**, colors only from `palette.ts`.
7. **Public routes** must be listed in `PUBLIC_PREFIXES` (`src/lib/supabase/proxy.ts`), or they
   redirect to `/login`.
8. **Never commit `.env.local`** or print secret values. `.env.example` lists names with blank
   values.
9. Don't add dependencies casually (see `docs/03-TECH-STACK.md` rules). Record any you add in
   `DECISIONS.md`.

## 3. Working loop
1. Baseline: `npm run typecheck && npm run lint && npm test` must pass before you change anything.
2. Make the change following the recipe in `docs/07`.
3. Add or extend tests (unit for `src/lib`, component for UI interactions, e2e for core flows).
4. Gate: typecheck, lint, `npm test`, `npm run build` all green. Run `npm run e2e` when touching
   task CRUD, auth, or the list UI (needs `E2E_EMAIL`/`E2E_PASSWORD`, see docs/06).
5. Update docs in the same change: `docs/01-PRD.md` (feature list), the touched sections of
   `docs/02-ARCHITECTURE.md`, `DECISIONS.md` (judgement calls), `PROGRESS.md` (what was verified),
   `PROJECT_STATUS.md` (anything the owner must do, in plain language).
6. Commit with a clear message. **Push only at milestones.** The owner asked for few pushes,
   and every push to `master` redeploys production.

If a gate fails three times in a row on the same problem, stop and report the exact error.

## 4. Things only the human owner can do
| Action | Where |
|--------|-------|
| Run SQL migrations | Supabase SQL editor (project `rjjchnqajfhmpivimcag`) |
| Set or change env vars, then **redeploy** | Vercel → Settings → Environment Variables |
| Set GitHub Actions secrets (`CRON_SECRET`, `APP_URL`) | GitHub → Settings → Secrets and variables → Actions |
| Supabase auth settings, URL configuration | Supabase dashboard |
| Resend keys / domain verification | resend.com |
| Google OAuth client, consent screen, redirect URIs | console.cloud.google.com (see docs/05 §3) |
| Install on a phone | the phone |

When a change needs one of these, put exact click-by-click steps in `PROJECT_STATUS.md` and in
your reply. Never ask for secrets to be pasted into chat when a dashboard step will do.

## 5. Owner preferences
- Everything must stay **free** to build and host.
- Keep the owner informed via `PROJECT_STATUS.md`: what's done, what's next, what they must do.
- Few, meaningful pushes to `master`.

## 6. Final report for a task
Reply with: what changed (user-visible), what you verified (commands + results), anything not
verified and why, migrations or settings the owner must apply, and whether you pushed.
