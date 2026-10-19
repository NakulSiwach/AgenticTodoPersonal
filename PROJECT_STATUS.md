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
| Deployed to Vercel | ✅ https://agentic-todo-personal.vercel.app |
| Live site verified (HTTPS, security headers, PWA files, sign-in, add/complete/color/delete) | ✅ 4/4 browser tests pass against the live URL |
| Installed on your phone | ⏳ Last step |

## Your actions (in order, about 10 minutes total)

### NEW – Profile, calendar, drag-to-reorder and the daily email (setup, about 10 minutes)

**Step A – database (1 min, required).** In the Supabase SQL editor run all of
`supabase/migrations/0003_profile_and_order.sql` (safe to re-run). Without it, drag-to-reorder and the
Profile settings show "Database needs the latest update".

**Step B – the daily email (only needed for the email feature).** Three pieces:
1. **Email sender (Resend, free).** Create an account at https://resend.com, make an API key.
   In Vercel → Project → Settings → Environment Variables add `RESEND_API_KEY` = that key.
   Until you verify a domain in Resend, mail can only be delivered to the email address you
   signed up to Resend with, so use the same address as your TaskFlow login (or verify a domain
   and also set `EMAIL_FROM`, e.g. `TaskFlow <hello@yourdomain.com>`).
2. **Server key for the morning job.** Supabase → Project Settings → API → copy the **service_role** key.
   Add it in Vercel as `SUPABASE_SERVICE_ROLE_KEY`. It is secret: server-only, never in the code or GitHub.
   Also add `NEXT_PUBLIC_SITE_URL` = `https://agentic-todo-personal.vercel.app` (used for links in the email).
3. **Scheduler.** Make up a long random string and add it in Vercel as `CRON_SECRET`. Then in GitHub →
   Settings → Secrets and variables → Actions add two secrets: `CRON_SECRET` (same string) and
   `APP_URL` (`https://agentic-todo-personal.vercel.app`, no trailing slash).
   The workflow `.github/workflows/daily-digest.yml` then checks every 15 minutes who is due.
4. Redeploy on Vercel (Deployments → ⋯ → Redeploy) so it picks up the variables.

**Check it works:** open Profile → Notifications → **Send me a test email now**. If it fails, the red
message says what is missing. Then turn the switch on, pick a time and Save.

### Action 0: add the v2 columns to your database (1 min, required for the v2 features)
The redesigned app adds due dates, lists, tags, subtasks and repeating tasks. Run once:
1. Open https://supabase.com/dashboard/project/rjjchnqajfhmpivimcag/sql/new
2. Paste all of `supabase/migrations/0002_features.sql` and click **Run** (safe to re-run; existing tasks are untouched).

Until you do, the app still loads, but saving a due date, list, tag, subtask or repeat shows
"Database needs the latest update: run supabase/migrations/0002_features.sql".

### ~~Action 1 and 2~~ - done, thank you

### ~~Action 3 (Vercel)~~ - done, live at https://agentic-todo-personal.vercel.app

### Action 4 – Allow your live URL in Supabase (1 min, still recommended)
Dashboard → **Authentication → URL Configuration**:
- Site URL: your Vercel URL
- Redirect URLs: add `https://agentic-todo-personal.vercel.app/**` and `http://localhost:3000/**`
(Password sign-in already works without this; it only matters for email links such as password reset or confirmation.)

### Action 5 – Install on your phone
- **Android (Chrome):** open the URL → sign up/in → ⋮ menu → *Install app*.
- **iPhone (Safari):** open the URL → Share → *Add to Home Screen*.

## What I do next
Nothing blocking. Once you've installed it on your phone, tell me if anything feels off.
Optional extras if you want them: export/backup button, due dates, search.

## Housekeeping
- The tests created throwaway accounts in Supabase (Authentication -> Users): `rlscheck.*@gmail.com` and `e2e.*@gmail.com`. They're fake addresses and safe to delete.
- Bug found and fixed by the e2e tests: a very fast tap on a just-added todo could be lost. Todos now get their id on your device and later changes wait for the save to land.

## Git and branches
- Local branch: `master`, tracking `origin/master` (https://github.com/NakulSiwach/AgenticTodoPersonal).
- I push only at milestones (pushes so far: initial, after e2e, after deploy), not on every change.
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
| 2026-10-17 | Deployed to Vercel; live site verified end to end; pushed |
| 2026-10-17 | DB + auth verified; RLS isolation and e2e tests pass; fixed fast-tap race; pushed |
