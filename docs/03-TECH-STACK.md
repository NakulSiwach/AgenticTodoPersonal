# 03 – Tech Stack (installed versions)

| Concern | Choice | Version | Notes |
|---------|--------|---------|-------|
| Framework | Next.js App Router | 16.4.2 | Middleware is called **proxy** (`src/proxy.ts`). Read `node_modules/next/dist/docs/` for APIs |
| UI | React | 19.3 | |
| Language | TypeScript, strict | 5.x | `@/*` → `src/*` |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` | 4.x | `postcss.config.mjs`; class-based dark mode in `globals.css` |
| Server state | TanStack Query | 5.x | One cache key per table: `["todos"]`, `["profile"]` |
| Validation | zod | 4.x | Mirrors DB CHECK constraints |
| Drag and drop | @dnd-kit core / sortable / utilities | 6 / 10 / 3 | Pointer + keyboard sensors |
| Icons | lucide-react | 1.x | |
| Database + auth | Supabase (Postgres, Auth, RLS) | supabase-js 2.x, @supabase/ssr 0.12 | Free tier |
| Email | Resend HTTP API via `fetch` | n/a | No SDK dependency |
| Scheduler | GitHub Actions cron | n/a | Every 15 min; public repo, so free |
| Hosting | Vercel Hobby | n/a | Auto-deploys `master` |
| Unit/component tests | Vitest + Testing Library + jsdom | vitest 3.2, jsdom 26 | `vitest@4` crashes npm's resolver here; jsdom 27 needs Node ≥ 22.12 |
| E2E | Playwright | 1.64 | Projects: Pixel 7, Desktop Chrome |
| Lint/format | ESLint 9 (next config), Prettier 3 | | |
| Runtime | Node.js 22 (dev machine 22.11) | | CI uses Node 22 |

## Rules
- Don't add a UI kit or a global state library. Server state = TanStack Query, UI state = `useState`.
- Don't add an ORM. supabase-js + SQL migrations are enough.
- Prefer small hand-written components over new dependencies. Each new dependency should earn its
  place and be recorded in `DECISIONS.md`.
- If you upgrade a major version, run the full test suite + e2e, and record it in `DECISIONS.md`.

## Scripts
| Command | Does |
|---------|------|
| `npm run dev` | dev server on :3000 |
| `npm run build` / `npm start` | production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit + component) |
| `npm run e2e` | Playwright; needs `E2E_EMAIL`, `E2E_PASSWORD` (and `E2E_BASE_URL` to test a deployed site) |
| `npm run icons` | regenerate PWA icons |
| `node --env-file=.env.local scripts/rls-check.mjs` | two-account security check against the real DB (creates two throwaway users) |
