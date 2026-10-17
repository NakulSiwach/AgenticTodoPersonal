# TaskFlow – Project Status (for you)

_Last updated: 2026-10-17_

## At a glance

| Area | State |
|------|-------|
| App code (UI, auth, TODOs, priorities, colors, highlights, PWA) | ✅ Done |
| Automated tests (30 unit + component) | ✅ Passing |
| Typecheck, lint, production build | ✅ Passing |
| Code on GitHub (`master`) | ✅ Pushed |
| Supabase project connected (URL + key in `.env.local`) | ✅ Key verified working |
| Database table `todos` created | ✅ Done, verified |
| Email confirmation turned off | ✅ Done, verified |
| End-to-end browser tests on your real database (phone + desktop sizes) | ✅ 4/4 passing |
| Security check: user B can't see/change user A's data | ✅ 10/10 passing |
| Deployed to Vercel (public URL) | ⏳ **Waiting on you** (Action 3) |
| Installed on your phone | ⏳ Last step |

## Your actions (in order, about 10 minutes total)

### ~~Action 1 and 2~~ - done, thank you

### Action 3 – Deploy on Vercel (5 min)
1. Go to https://vercel.com/signup and sign in **with GitHub**.
2. **Add New → Project** → import `NakulSiwach/AgenticTodoPersonal`.
3. Framework is auto-detected as Next.js. Under **Environment Variables** add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://rjjchnqajfhmpivimcag.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key (same as in your `.env.local`) |
   | `NEXT_PUBLIC_SITE_URL` | leave blank for now, set after first deploy |

4. Click **Deploy**. Copy the URL it gives you (like `https://agentic-todo-personal.vercel.app`) and **send it to me**.

### Action 4 – Allow your live URL in Supabase (1 min)
Dashboard → **Authentication → URL Configuration**:
- Site URL: your Vercel URL
- Redirect URLs: add `https://<your-vercel-url>/**` and `http://localhost:3000/**`

### Action 5 – Install on your phone
- **Android (Chrome):** open the URL → sign up/in → ⋮ menu → *Install app*.
- **iPhone (Safari):** open the URL → Share → *Add to Home Screen*.

## What I do next
1. After you send the Vercel URL: check the live site (HTTPS, headers, login, data) and update this file.
2. Optional extras if you want them: export/backup button, due dates, search.

## Housekeeping
- The tests created throwaway accounts in Supabase (Authentication -> Users): `rlscheck.*@gmail.com` and `e2e.*@gmail.com`. They're fake addresses and safe to delete.
- Bug found and fixed by the e2e tests: a very fast tap on a just-added todo could be lost. Todos now get their id on your device and later changes wait for the save to land.

## Git and branches
- Local branch: `master`, tracking `origin/master` (https://github.com/NakulSiwach/AgenticTodoPersonal).
- I push only at milestones (first push done; next after e2e tests pass and after deploy), not on every change.
- `.env.local` (your keys) is git-ignored and never pushed.

## Security notes
- The anon key is public by design; data is protected by Row Level Security, so each login only sees its own TODOs.
- Never share the `service_role` key, DB password, or your Supabase/GitHub/Vercel passwords with anyone or any tool.
- Free-tier reminder: Supabase pauses a project after ~1 week of no use. Open the dashboard and click **Restore**; data is kept.

## Cost
₹0 / $0: GitHub Free, Supabase Free, Vercel Hobby.

## Change log
| Date | What |
|------|------|
| 2026-10-17 | Built full app, tests, PWA, CI; connected Supabase; pushed to `master` |
| 2026-10-17 | DB + auth verified; RLS isolation and e2e tests pass; fixed fast-tap race; pushed |
