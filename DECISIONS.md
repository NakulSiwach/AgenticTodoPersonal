# Decisions

Deviations and judgement calls made while building, versus `docs/`.

| # | Decision | Why |
|---|----------|-----|
| 1 | Next.js **16** (not 15). Uses `src/proxy.ts` instead of `middleware.ts` | Latest stable at build time; Next 16 renamed middleware to proxy |
| 2 | Removed scaffold's `cacheComponents` / `partialPrefetching` flags | Not needed; they impose Suspense rules on dynamic pages |
| 3 | Fonts: system font stack instead of `next/font` Geist | Faster phone load, no build-time font fetch |
| 4 | Login is email + password only; **no magic link** | Keeps auth simple and avoids email-rate-limit issues on Supabase free tier |
| 5 | `vitest@3` and `jsdom@26` pinned | npm's resolver crashed on `vitest@4`; jsdom 27 needs Node >= 22.12 (dev machine has 22.11) |
| 6 | Priority change on a row uses a transparent native `<select>` over the badge | Native picker on phones, accessible, no popover code |
| 7 | Delete is deferred 5 s client-side (undo window), then really deleted | Matches PRD US-7; closing the tab inside 5 s leaves the item in place (safe failure) |
| 8 | Playwright projects: Pixel 7 + Desktop Chrome only (no iPhone/WebKit) | Avoids a heavy WebKit download; iOS covered by manual checklist |
| 9 | RLS isolation is tested by `scripts/rls-check.mjs` against the real DB (creates two throwaway users) rather than in CI | Needs real auth and the live policies; CI has no database |
| 10 | Service worker caches static assets and the offline page only | Todo data needs auth and must never be served stale from cache |
| 11 | New todos get their UUID on the client (`id` is sent on insert) instead of a temporary id | The optimistic row keeps its identity (no remount, no disabled state). Found via e2e: a fast tap could be lost during the swap |
| 12 | Updates/deletes wait for that todo's pending insert (`pendingCreates` in `queries.ts`) | Otherwise a quick tap could update a row the server hasn't stored yet. Covered by a component test |
| 13 | Optimistic changes are applied **synchronously** in the `mutate` wrapper, then re-applied after `cancelQueries` | Applying them only in `onMutate` (async) let a controlled checkbox snap back for a frame; found as a flaky e2e on desktop |
| 14 | After a successful write, the server row is adopted into the cache instead of refetching the list (skipped while other writes are pending) | Refetches in flight made later taps wait a network round trip and risked stale overwrites |
| 15 | Scheduler is GitHub Actions every 15 min, not Vercel Cron | Vercel Hobby cron runs at most once a day, which can't honour each user's chosen time. Public repo, so Actions minutes are free |
| 16 | Digest send is "claim the day, then send; release on failure" via `profiles.last_digest_date` | GitHub runs can overlap, be late or repeat; this guarantees at most one email per local day and retries failures |
| 17 | 3-hour send window after the chosen time (`SEND_WINDOW_MINUTES`) | GitHub cron is best-effort and can be delayed; a late run should still send |
| 18 | Resend called with plain `fetch`, no SDK | One endpoint, no dependency |
| 19 | Lists and tags are plain columns (`list_name`, `tags[]`), no separate tables | Single user, small data; lists appear and disappear with their tasks. Revisit if lists need colors/sharing |
| 20 | Manual order uses a float `sort_order` with midpoints, and undragged tasks map to `-created_at` | A drop writes exactly one row; dragged and undragged tasks coexist |
| 21 | Dark mode is class-based (`.dark` on `<html>`) with an inline pre-paint script | Allows a manual System/Light/Dark toggle without a flash |
| 22 | Custom `Dropdown` (portal + flip) instead of native `<select>` in most places | Consistent styling in dark mode and on the bottom add bar; native select kept on the row priority badge |
| 23 | Profiles are created lazily by upsert, with client defaults when no row exists | No sign-up trigger needed; works for accounts created before v3 |
| 24 | e2e uses `click()` + `expect(...).toBeChecked()` instead of `check()` | `check()` asserts in the same instant as the click and flakes with React controlled inputs |
| 25 | Reminders are their own table, not tasks with a flag | No completion state, different schedule shapes (days of week, monthly day), shouldn't clutter task views or counts |
| 26 | Reminders live in the same daily email (top section); email also goes out with reminders only | Owner asked for one email; a day with only "take medicines" still deserves a nudge |
| 27 | Quotes are a curated local list, not a quotes API | Free APIs return generic or misattributed quotes, rate-limit, and add an outage point to the email. Deterministic per date |
| 28 | `digest_quote_enabled` is only sent on save when changed | Saving digest settings keeps working before migration 0005 is applied |
| 29 | Built on branch `feature/reminders-quotes` in a separate worktree, migration numbered 0005 | Another agent was working on Google Calendar (0004) in the main folder at the same time |
