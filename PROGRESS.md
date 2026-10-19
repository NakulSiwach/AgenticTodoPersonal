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
