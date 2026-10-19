# 06 – Testing and QA

## 1. What exists

| Layer | Tool | Files | Covers |
|-------|------|-------|--------|
| Unit | Vitest | `tests/unit/*.test.ts` | schema limits, sort, views (membership, grouping, counts, progress), order math, quick-add parser, dates/repeat stepping, calendar grid/stats, digest (content, escaping, timezone send window), palette contrast |
| Component | Vitest + Testing Library + jsdom | `tests/component/TodoApp.test.tsx`, `ProfileApp.test.tsx` | add/toggle/edit/delete+undo, repeat rollover, optimistic rollback + toast, insert-then-update race, quick-add, search, list filter, colors, subtasks/tags/due, dropdown Escape, drag handles shown/hidden (actual dragging is only covered manually), profile tabs, digest settings save, test-email success/failure (mocked fetch), display name |
| E2E | Playwright (Pixel 7 + Desktop Chrome) | `e2e/todo.spec.ts` | redirect when signed out; add → priority → complete → reload → uncomplete → colors → delete + undo → delete; quick-add tokens |
| Security | Node script, real DB | `scripts/rls-check.mjs` | two accounts: no cross-user read/update/delete/insert; DB rejects bad enums; `completed_at` trigger |

Current totals: 94 unit + component tests; 3 e2e tests × 2 devices.

## 2. How to run
```bash
npm test                    # unit + component (no network)
npm run typecheck && npm run lint
npm run build               # needs NEXT_PUBLIC_SUPABASE_* (dummy values are fine for build)

# E2E against local dev server (started automatically) or a deployed URL
E2E_EMAIL=… E2E_PASSWORD=… npm run e2e
E2E_BASE_URL=https://agentic-todo-personal.vercel.app E2E_EMAIL=… E2E_PASSWORD=… npm run e2e

node --env-file=.env.local scripts/rls-check.mjs   # creates two throwaway users each run
```
E2E needs a real account in the Supabase project. Create one by signing up in the app (email
confirmation is off). Use a throwaway account, not the owner's. Prefer running e2e against a
production build (`npm run build && npx next start -p 3200`, `E2E_BASE_URL=http://localhost:3200`),
which is faster and closer to what users get than dev mode.

## 3. Conventions and gotchas
- **Select by role and accessible name**, as users perceive the page. Use `exact: true` when a name
  is a prefix of another ("Add" vs "Add to list").
- **For checkboxes, use `click()` followed by `expect(...).toBeChecked()` / `.not.toBeChecked()`**,
  not `check()`/`uncheck()`. Playwright's `check()` verifies the state immediately after the click
  and flakes against React's controlled inputs.
- Component tests mock `@/lib/todos` with a small **stateful in-memory "server"** so refetches see
  saved data. Follow that pattern instead of one-off `mockResolvedValue`s.
- The loading skeleton renders `<li>` items: wait for real content (`findByText`) before counting
  list items.
- Mock `next/navigation` and `@/lib/supabase/client` in component tests (see existing files).
- Every new `src/lib` function gets unit tests; date logic should pass a fixed `now`/`today`.
- E2E tests clean up the tasks they create, so reruns start clean.

## 4. Manual checklist (UI changes)
- [ ] 360 px phone width: no horizontal scroll, composer not hidden by keyboard or home bar
- [ ] 768 px and 1280 px: sidebar layout correct
- [ ] Light and dark theme; colors readable
- [ ] Keyboard only: Tab order, Enter/Escape, shortcuts `n` `/`
- [ ] Installed PWA opens standalone; new version appears after a reload

## 5. Definition of done
See [07-ADDING-FEATURES.md §10](07-ADDING-FEATURES.md#10-definition-of-done-for-a-feature).

## 6. Reminders and quotes (v4)
Unit: `reminders.test.ts` (every schedule incl. month-end and leap-day clamping, next date,
descriptions, schema, sorting), `quotes.test.ts` (collection sanity, deterministic full cycle,
author spread), `digestReminders.test.ts` (sections, order, subject, escaping). Component:
`RemindersPanel.test.tsx` (add weekly, validation, ideas, pause, edit, delete + undo, rollback,
load error, Today card), `QuoteSetting.test.tsx`. E2E: `e2e/reminders.spec.ts`. RLS:
`scripts/rls-check.mjs` covers `reminders`.
