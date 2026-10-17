# 03 – Tech Stack

## Chosen stack

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | **Next.js (App Router) 15.x** | One codebase for UI + routing + auth middleware; first-class Vercel deploy |
| Language | **TypeScript (strict)** | Fewer bugs; agent-friendly |
| Styling | **Tailwind CSS 4.x** | Fast mobile-first UI, dark mode built in |
| Server state | **TanStack Query 5.x** | Optimistic updates, cache, retries |
| Validation | **zod 3.x** | Shared schemas |
| Backend/DB | **Supabase** (Postgres + Auth + RLS) | Free tier, no server to write, secure by policy |
| Supabase client | `@supabase/supabase-js`, `@supabase/ssr` | Cookie-based sessions in Next.js |
| Icons | `lucide-react` | Lightweight |
| Unit/component tests | **Vitest + React Testing Library** | Fast |
| E2E tests | **Playwright** (mobile viewport project) | Real browser, phone emulation |
| Lint/format | ESLint (next config) + Prettier | Standard |
| Hosting | **Vercel** (Hobby, free) | Auto HTTPS, previews, global CDN |
| CI | GitHub Actions (lint, typecheck, unit, build) | Optional but included |
| Package manager | npm | Zero setup |
| Runtime | Node.js 20 LTS or 22 LTS | |

Use the latest stable versions at build time; if a major-version API differs from this document, follow the installed version's official docs and record it in `DECISIONS.md`.

## Why not the alternatives

| Alternative | Verdict |
|-------------|---------|
| Vite + React + Express + SQLite | Simple locally, but you must host a server and database yourself; more ops work |
| Firebase (Firestore) | Fine, but SQL + RLS is easier to reason about and test |
| Plain HTML + localStorage | Not synced between phone and PC; data lost if browser cleared |
| Native app (React Native/Flutter) | Overkill; PWA covers "use on my phone" |
| Prisma/Drizzle ORM | Unneeded: supabase-js + SQL migration is enough for one table |
| Redux/Zustand | TanStack Query already handles server state; local UI state fits `useState` |

## Free-tier limits (as of writing; verify)

- Supabase Free: 500 MB DB, 50k monthly active users, projects pause after ~1 week of inactivity (just click "Restore"; data kept).
- Vercel Hobby: personal non-commercial use, generous bandwidth.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app   # for auth redirects
```

`.env.example` is committed with blank values; `.env.local` is git-ignored.

## npm scripts (required)

```
dev, build, start, lint, typecheck (tsc --noEmit), test (vitest run), e2e (playwright test)
```
