# 06 – Testing and QA

## 1. Test pyramid

| Level | Tool | What |
|-------|------|------|
| Unit | Vitest | `schema.ts`, `sort.ts`, `palette.ts` (incl. contrast), `todos.ts` with mocked client |
| Component | Vitest + RTL | TodoRow toggle, ColorPicker selection/disabled combos, Composer validation, EditSheet save/delete, optimistic rollback |
| E2E | Playwright (Pixel 7, iPhone 13, desktop Chrome) | Full user flows against a real Supabase test account |
| Security | Playwright/script | RLS isolation between two accounts |
| Non-functional | Lighthouse | Perf/A11y/PWA >= 90 |

## 2. Key test cases

**Sorting:** fixture `[P2 done, P0 active, P3 active, P0 active older]` → order: P0 newest, P0 older, P3, P2 done.
**Validation:** empty title rejected; 201-char title rejected; priority 5 rejected; unknown color key rejected.
**Toggle:** click checkbox → strikethrough immediately; reload → state persisted; click again → restored, `completed_at` null.
**Priority change:** badge → choose P0 → badge text "P0" red, row moves to top of active.
**Colors:** choose red text + yellow highlight → classes applied; reload persists; unreadable combos are disabled in picker.
**Delete/undo:** delete → toast; Undo within 5 s restores the same content.
**Auth:** signed-out `/` redirects to `/login`; wrong password shows error; sign out clears session.
**RLS:** with user B's token, `select` on user A's todo returns 0 rows; `update`/`delete` affect 0 rows; `insert` with A's `user_id` is rejected.
**Offline:** go offline → app shell still loads, friendly message shown, no crash.

## 3. Manual phone checklist

- [ ] Installs to home screen (Android and/or iOS)
- [ ] Opens standalone (no browser bar), correct icon and name
- [ ] Composer is not hidden by the keyboard or the iOS home bar
- [ ] Tap targets comfortable; no accidental horizontal scroll
- [ ] Dark mode follows system
- [ ] Add on phone → visible on desktop

## 4. Definition of Done

- [ ] All user stories US-1 … US-10 meet their acceptance criteria
- [ ] `npm run lint`, `typecheck`, `test`, `build` pass with zero errors
- [ ] `npm run e2e` passes on mobile and desktop projects
- [ ] RLS isolation test passes
- [ ] Lighthouse mobile: Performance, Accessibility, PWA/installable >= 90
- [ ] No secrets in repo (`git grep -i service_role` empty; `.env.local` ignored)
- [ ] Deployed; production URL recorded in `PROGRESS.md`
- [ ] `DECISIONS.md`, `PROGRESS.md`, `.env.example` present
- [ ] Final report delivered in the format specified in `AGENT_INSTRUCTIONS.md`
