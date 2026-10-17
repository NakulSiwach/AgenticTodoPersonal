# 04 – Step-by-Step Build Plan

Each step: **Do** → **Verify** gate. Do not proceed until Verify passes. Commit after each step (`step N: ...`) and log in `PROGRESS.md`.

---

## Step 0 – Prerequisites
**Do:** Confirm Node >= 20 (`node -v`), npm, git. Human creates GitHub, Supabase, Vercel accounts.
**Verify:** `node -v` prints v20+.

## Step 1 – Scaffold
**Do:**
```
npx create-next-app@latest taskflow --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
Move into the project (or scaffold in place if the folder is already the project root; keep `docs/`, `README.md`, `AGENT_INSTRUCTIONS.md`). Install:
```
npm i @supabase/supabase-js @supabase/ssr @tanstack/react-query zod lucide-react
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier @playwright/test
```
Enable `"strict": true`. Add npm scripts from `03-TECH-STACK.md`. Create `.env.example`, ensure `.env.local` in `.gitignore`.
**Verify:** `npm run dev` serves the default page; `npm run typecheck` passes.

## Step 2 – Database (Supabase)
**Do:** Create `supabase/migrations/0001_init.sql` containing the table, index, trigger, RLS policies from `02-ARCHITECTURE.md` §4–5. Human (or CLI) runs it in the Supabase SQL editor. In Supabase → Authentication → Providers enable Email; for fast personal use, optionally disable "Confirm email". Add Site URL and redirect URLs (`http://localhost:3000/**` and the Vercel URL later).
**Verify:** In the Supabase table editor, `todos` exists with RLS enabled. Run in SQL editor: `select polname from pg_policy where polrelid='public.todos'::regclass;` returns 4 policies.

## Step 3 – Supabase clients and auth plumbing
**Do:** Implement `src/lib/supabase/client.ts` (browser client), `server.ts` (server client with cookies), `middleware.ts` helper, and root `src/middleware.ts` that refreshes the session and redirects unauthenticated requests (except `/login`, `/auth/*`, static assets, manifest, icons, sw.js) to `/login`. Add `auth/callback/route.ts` exchanging the code for a session.
**Verify:** Visiting `/` while signed out redirects to `/login`.

## Step 4 – Login page
**Do:** `/login` with email + password, "Sign in" and "Create account" toggle, error messages, loading state, and a "Send magic link" secondary option. Redirect to `/` on success. Header gets a Sign out button.
**Verify:** Create an account, land on `/`, refresh (still signed in), sign out returns to `/login`.

## Step 5 – Domain layer
**Do:** Write `types.ts`, `schema.ts` (zod: title trim 1–200, notes <= 2000, priority 0–4, color enums), `palette.ts` (per Architecture §7, plus `isReadable(text, highlight)` using WCAG contrast on representative hex values), `sort.ts` (incomplete first → priority asc → created_at desc), `todos.ts` (list/create/update/delete via supabase-js with typed results and thrown errors).
**Verify:** Vitest unit tests pass for: schema accept/reject cases, sort order with a mixed fixture, palette key coverage (every key has a class string), contrast table.

## Step 6 – Query hooks with optimistic updates
**Do:** `QueryClientProvider` in layout (client wrapper). `queries.ts`: `useTodos`, `useCreateTodo`, `useUpdateTodo` (covers toggle, priority, colors, edits), `useDeleteTodo` using the snapshot/rollback pattern in Architecture §6.
**Verify:** Component test with mocked `todos.ts`: toggling updates UI immediately and reverts when the mock rejects.

## Step 7 – UI components (mobile first)
**Do:** Build in this order, each with a basic test: `PriorityBadge`, `ColorPicker`, `PriorityPicker`, `TodoRow`, `TodoList` (empty state "Nothing to do 🎉"), `FilterBar`, `Composer` (sticky bottom, safe-area padding), `EditSheet` (bottom sheet, focus trap, Esc, backdrop click), `Toast`, `Header`. Apply colors only through `palette.ts`. Row layout: `[checkbox] [title span with text+highlight classes] [priority badge]`; completed = `line-through opacity-60`.
**Verify:** Each component test passes; manually verify at 375px width that nothing overflows horizontally and targets are >= 44px.

## Step 8 – Assemble the app
**Do:** `TodoApp.tsx` composes Header, FilterBar, TodoList, Composer, EditSheet, Toasts; filter state in `useState` (optionally mirrored to URL search params). Active counter. Delete with Undo toast. `page.tsx` is a server component that confirms the session and renders `TodoApp`.
**Verify:** Manual run-through: add 3 todos with different priorities → ordering correct; complete one → it sinks and is struck through; uncomplete → returns; set text color + highlight → persists after refresh; delete + undo works.

## Step 9 – Polish
**Do:** Dark mode (Tailwind `dark:` classes, `color-scheme` meta), loading skeletons, `error.tsx`, `not-found.tsx`, favicon, focus-visible rings, `prefers-reduced-motion` respected, security headers in `next.config.ts`.
**Verify:** Lighthouse (mobile) accessibility >= 90, no console errors.

## Step 10 – PWA
**Do:** `src/app/manifest.ts`; generate icons (192, 512, maskable 512, apple-touch 180) into `public/icons`; minimal `public/sw.js` + client registration (production only); offline fallback route/page; iOS meta tags in `layout.tsx`.
**Verify:** `npm run build && npm start`, Lighthouse PWA/installable checks pass; DevTools → Application shows manifest and active service worker.

## Step 11 – End-to-end tests
**Do:** Playwright config with `Pixel 7` and `iPhone 13` projects. Tests (use a dedicated test account via env `E2E_EMAIL`/`E2E_PASSWORD`): login; add todo; toggle complete/uncomplete; change priority; set colors; delete+undo; RLS check using two accounts via supabase-js asserting account B cannot read A's row.
**Verify:** `npm run e2e` all green.

## Step 12 – CI
**Do:** `.github/workflows/ci.yml` running `npm ci`, lint, typecheck, test, build on push/PR.
**Verify:** Workflow passes on GitHub.

## Step 13 – Deploy
**Do:** Follow `05-DEPLOYMENT.md`: push to GitHub, import in Vercel, set env vars, deploy, update Supabase redirect URLs with the production URL.
**Verify:** Production URL loads, login works, data persists, `curl -I <url>` shows HTTPS and security headers.

## Step 14 – Phone install and final QA
**Do:** Human opens URL on the phone, signs in, installs to home screen (see `05-DEPLOYMENT.md` §5). Agent runs the checklist in `06-TESTING-AND-QA.md`.
**Verify:** Definition of Done fully ticked. Write the final report.
