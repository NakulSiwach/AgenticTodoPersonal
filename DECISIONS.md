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
| 9 | RLS two-account isolation test is a manual SQL/dashboard check, see `docs/06` | Needs two real accounts on the live project |
| 10 | Service worker caches static assets and the offline page only | Todo data needs auth and must never be served stale from cache |
| 11 | New todos get their UUID on the client (`id` is sent on insert) instead of a temporary id | The optimistic row keeps its identity (no remount, no disabled state). Found via e2e: a fast tap could be lost during the swap |
| 12 | Updates/deletes wait for that todo's pending insert (`pendingCreates` in `queries.ts`) | Otherwise a quick tap could update a row the server hasn't stored yet. Covered by a component test |
