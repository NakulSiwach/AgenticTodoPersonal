# TaskFlow – Project Status (for you)

_Last updated: 2026-10-17_

## At a glance

| Area | State |
|------|-------|
| App code (UI, auth, TODOs, priorities, colors, highlights, PWA) | ✅ Done |
| Automated tests (28 unit + component) | ✅ Passing |
| Typecheck, lint, production build | ✅ Passing |
| Code on GitHub (`master`) | ✅ Pushed |
| Supabase project connected (URL + key in `.env.local`) | ✅ Key verified working |
| Database table `todos` created | ⏳ **Waiting on you** (Action 1) |
| Email confirmation turned off | ⏳ **Waiting on you** (Action 2) |
| End-to-end tests against real database | ⏳ Blocked on Action 1 + 2 |
| Deployed to Vercel (public URL) | ⏳ Blocked on Action 3 |
| Installed on your phone | ⏳ Last step |

## Your actions (in order, about 10 minutes total)

### Action 1 – Create the database table (2 min)
1. Open https://supabase.com/dashboard/project/rjjchnqajfhmpivimcag/sql/new
2. Open `supabase/migrations/0001_init.sql` in this repo, copy **all** of it, paste, click **Run**.
3. Expect "Success. No rows returned".

### Action 2 – Turn off email confirmation (1 min)
Dashboard → **Authentication** → **Sign In / Providers** (or "Providers") → **Email** → switch **Confirm email** OFF → Save.
(Without this, sign-up waits for an email link. For a personal app, off is fine.)

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

## What I do next (after Actions 1–2)
1. Verify the table + security rules from outside (anonymous access must return nothing).
2. Create a throwaway test account and run the Playwright end-to-end tests (add, priority, complete/uncomplete, colors, delete + undo).
3. Prove one account cannot read another's TODOs.
4. After you send the Vercel URL: check the live site (HTTPS, headers, login, data), then update this file.

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
