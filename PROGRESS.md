# Progress

| Step | Status | Verification |
|------|--------|--------------|
| 1 Scaffold | done | typecheck + lint clean |
| 2 Database SQL | done | applied by user; verified from outside (anon read -> [], anon insert -> blocked by RLS) |
| 3 Supabase clients + proxy | done | `/` redirects to `/login` (curl: 307) |
| 4 Login page | done | `/login` 200 |
| 5 Domain layer | done | unit tests: schema, sort, palette/contrast |
| 6 Query hooks (optimistic) | done | component test: toggle + rollback + toast |
| 7-8 UI + assembly | done | 30/30 vitest tests pass |
| 9 Polish | done | dark mode, skeletons, error/404, headers verified via curl |
| 10 PWA | done | manifest 200, sw.js 200, icons 200, offline page 200 |
| 11 E2E + RLS | done | `npm run e2e` 4/4 pass (Pixel 7 + Desktop Chrome); `scripts/rls-check.mjs` 10/10 pass |
| 12 CI | written | runs on first push |
| 13 Deploy | done | Vercel; live e2e 4/4 pass; HTTPS + security headers + PWA files 200 |
| 14 Phone install | pending | user |

Production build: passes with dummy env (`npm run build`).
Live URL: https://agentic-todo-personal.vercel.app

## UI redesign (v2)

| Item | Status | Verification |
|------|--------|--------------|
| Tailwind actually compiled (`@tailwindcss/postcss` + `postcss.config.mjs`; removed unused `@tailwindcss/turbopack`) | done | screenshots, `npm run build` |
| Responsive shell: sidebar (laptop/tablet), slide-in menu + bottom quick-add (phone) | done | screenshots at 360, 390, 768, 1280 px; no horizontal overflow |
| Views: Inbox, Today, Upcoming, All, Completed, Lists, Tags; search; sort; priority filter | done | unit + component tests |
| Due dates, repeat, subtasks, tags, lists, quick-add parsing (`tomorrow !1 #list @tag`) | done | unit + component tests |
| Dark/light/system theme toggle, keyboard shortcuts (`n`/`q` add, `/` search) | done | screenshots |
| Migration `0002_features.sql` | written, **needs running by user** | - |
| E2E specs updated for new UI | written, not run (needs E2E_EMAIL/E2E_PASSWORD) | typecheck only |

Tests: 57 unit + component passing.

## v3: profile, calendar, email digest, reorder

| Item | Status | Verification |
|------|--------|--------------|
| Theme toggle + profile avatar menu at top right (sidebar footer removed) | done | screenshots, component test |
| `/profile` page: Calendar, Notifications, Account tabs | done | screenshots (desktop, phone, dark), component tests |
| Calendar: month grid, done/pending/overdue, per-day list | done | unit + screenshot |
| Daily email digest: HTML + text, grouped by priority, per-user time + timezone, once per day | done | unit tests (build, escape, timezone window) |
| Cron route `/api/cron/digest` (secret-protected) + GitHub Actions schedule | written | **not run end to end**: needs Resend key, service-role key, secrets |
| "Send me a test email" button (`/api/digest/test`) | written | UI tested with a mocked response; real send needs Resend key |
| Drag to reorder (priority order by default, Manual order option) | done | real mouse drag in browser, unit tests for ordering |
| Migration `0003_profile_and_order.sql` | written, **needs running by user** | - |

Tests: 94 unit + component passing.

## v3 follow-up (2026-10-20)

| Item | Status | Verification |
|------|--------|--------------|
| Instant optimistic updates (sync apply + adopt server row, no refetch on success) | done | 94/94 vitest; e2e 6/6 on four consecutive runs against a production build |
| e2e: exact "Add" selector, click()+expect for checkboxes | done | same |
| Migrations 0002 + 0003 applied in production | done | probed columns + `profiles` table as a signed-in test user |
| Cron route | done | prod: 401 without/with wrong secret; local with secret → `{"checked":1,"sent":0,"skipped":1,"failed":0}` |
| Email in production | done | owner confirmed test email works after replacing a Supabase key in `RESEND_API_KEY` |
| Docs refresh for future agents | done | README, AGENT_INSTRUCTIONS, AGENTS.md pointer, docs/01–07, DECISIONS 13–24 |

## v4: Google Calendar sync (2026-10-20)

| Item | Status | Verification |
|------|--------|--------------|
| Migration `0004_google_calendar.sql` (server-only table) | written, **needs running by owner** | - |
| Event mapping + sync plan (`gcalEvents.ts`) | done | 14 unit tests |
| OAuth, token encryption, Calendar API, `syncUser` (`google.ts`) | done | 10 unit tests against an in-memory fake Google API (create, skip unchanged, update, delete, 409 restore, hand-made events untouched, deleted calendar recreated, 120-write cap, revoked access) |
| Routes `/api/gcal`, `/connect`, `/callback`, `/sync`, `/disconnect`, `/api/cron/gcal` | done | `npm run build`; local prod server: cron 401 without/with wrong secret, 200 `{"checked":0,"note":"…not configured"}` with secret; `/api/gcal*` redirect to `/login` when signed out |
| Auto-sync after task writes (debounced, keepalive on hide) | done | 3 unit tests (no-op when disconnected, debounce, batches) |
| Profile → Calendar: Google Calendar card | done | 5 component tests |
| Workflow step "Re-sync Google Calendars" | written | runs on next push |
| `rls-check.mjs`: no client access to `google_calendar_links` | written | **not run**: needs migration 0004 applied |
| Real Google consent + Calendar end to end | **not run** | needs the owner's Google Cloud OAuth client |

Gate: typecheck, lint, `npm test` (126/126), `npm run build` all green. e2e not run (no `E2E_*`
credentials in this session; task CRUD only changed by adding a post-success hook).
