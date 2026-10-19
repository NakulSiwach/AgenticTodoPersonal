# TaskFlow – Project Status (for you)

_Last updated: 2026-10-20_

Live app: https://agentic-todo-personal.vercel.app

## At a glance

| Area | State |
|------|-------|
| Tasks: add, complete/uncomplete, P0–P4, text colors, highlights, edit, delete + undo | ✅ Live |
| Due dates, repeat, lists, tags, subtasks, quick-add typing, search, sort, filters | ✅ Live |
| Drag to reorder, theme toggle, keyboard shortcuts | ✅ Live |
| Profile: calendar, notifications, account | ✅ Live |
| Daily email digest (test email confirmed working on 2026-10-20) | ✅ Live |
| Google Calendar sync (tasks with a due date → a "TaskFlow" calendar in your Google account) | 🛠️ Built, needs your setup below |
| Database migrations 0001, 0002, 0003 | ✅ Applied |
| Database migration 0004 (Google Calendar) | ⏳ Your step |
| Automated tests: 126 unit/component, 6 end-to-end runs (phone + desktop), security check | ✅ Passing |
| Documentation for future agents (architecture, feature recipes, deployment, testing) | ✅ Up to date |
| Installed on your phone | ⏳ Your step |

## Turn on Google Calendar sync (about 15 minutes, free)

Do these in order. Nothing breaks if you haven't done them yet: the Google card simply says it
isn't set up.

1. **Database.** Supabase → SQL Editor → New query → paste all of
   `supabase/migrations/0004_google_calendar.sql` → **Run**. "Success. No rows returned" = good.
2. **Google Cloud project.** Open https://console.cloud.google.com (sign in with the Google account
   whose calendar you want) → project picker at the top → **New project** → name `TaskFlow` →
   Create, and make sure it's selected.
3. **Enable the API.** Search bar: "Google Calendar API" → **Enable**.
4. **Consent screen.** Menu → **Google Auth Platform** → **Get started**: App name `TaskFlow`,
   support email = yours → Audience **External** → contact email = yours → agree → Create.
5. **Permission.** Google Auth Platform → **Data access** → **Add or remove scopes** → in "Manually
   add scopes" paste `https://www.googleapis.com/auth/calendar.app.created` → Add to table → also
   tick `openid` and `.../auth/userinfo.email` → Update → **Save**.
6. **Publish it.** Google Auth Platform → **Audience** → **Publish app** → Confirm. (If you skip
   this, Google disconnects you every 7 days.) Google won't review it; that's fine for your own use.
7. **Create the login client.** Google Auth Platform → **Clients** → **Create client** → type
   **Web application**, name `TaskFlow web` → under **Authorized redirect URIs** add both:
   - `https://agentic-todo-personal.vercel.app/api/gcal/callback`
   - `http://localhost:3000/api/gcal/callback`

   → Create. Keep the window with the **Client ID** and **Client secret** open.
8. **Vercel.** Project → Settings → Environment Variables → add, for **Production**:
   - `GOOGLE_CLIENT_ID` = the Client ID
   - `GOOGLE_CLIENT_SECRET` = the Client secret
   - `GOOGLE_TOKEN_KEY` = a new long random string (e.g. a 40+ character password from your
     password manager). Don't change it later, or you'll need to reconnect.

   Then Deployments → ⋯ on the latest → **Redeploy**.
9. **Connect.** Open the app → avatar → **Profile** → **Calendar** tab → **Connect Google Calendar**.
   Google will say *"Google hasn't verified this app"*: click **Advanced** → **Go to TaskFlow
   (unsafe)** (it's your own app) → allow access. You'll land back on the Profile page with
   "Google Calendar connected".
10. **Check.** In Google Calendar you'll see a new calendar **TaskFlow** with your dated tasks.
    Add a task with a due date in TaskFlow; it shows up in Google within a few seconds.

What to expect: one-way sync (change tasks in TaskFlow, not in Google). Finished tasks stay as
"✓ Task" in grey. Deleting a task removes its event. Disconnect anytime from the same card
(optionally deleting the TaskFlow calendar).

## Still on your side

1. **Install on your phone.** Android (Chrome): open the URL → ⋮ → *Install app*.
   iPhone (Safari): Share → *Add to Home Screen*.
2. **Check the scheduler once (if not done).** GitHub → your repo → **Actions** → **Daily digest**
   → **Run workflow**. Green with `{"checked":…,"failed":0}` in the log = good.
3. **Optional:** Supabase → Authentication → URL Configuration: Site URL = the live URL; redirect
   URLs `https://agentic-todo-personal.vercel.app/**` and `http://localhost:3000/**`.
4. **Optional clean-up:** Supabase → Authentication → Users: delete the fake test accounts
   (`rlscheck.*@gmail.com`; keep one `e2e.*@gmail.com` if you want me to keep running browser tests).
5. **Optional, security:** if the Supabase `service_role` key was ever pasted into the Resend
   variable, it was sent to Resend once. To be safe, switch to a new Supabase secret key (steps in
   `docs/05-DEPLOYMENT.md` §7). I can walk you through it.

## Good to know

- **How changes go live:** a push to `master` on GitHub redeploys automatically in 1–2 minutes.
  Changing a Vercel environment variable needs a manual **Redeploy**.
- **Database changes** are SQL files you run once in the Supabase SQL editor. I'll always tell you
  which one and when.
- **Free-tier quirks:** Supabase pauses after ~1 week unused (click **Restore**, data is kept).
  GitHub pauses the daily email schedule after 60 days without repo activity (Actions tab →
  enable). The email only goes to the address you signed up to Resend with, unless you verify a
  domain in Resend.
- **The daily email** arrives within ~15 minutes after your chosen time, only when something is due
  today or overdue.
- **Secrets:** `.env.local` on this PC holds your keys and is never pushed. Never share the
  `service_role` key, Resend key, or passwords.

## Handing work to another AI agent

Point it at the repo and say: *"Read AGENTS.md and AGENT_INSTRUCTIONS.md, then do X."* The docs
explain the architecture, how to add features safely, how to test, and what only you can do.

## Change log
| Date | What |
|------|------|
| 2026-10-17 | v1: tasks, priorities, colors, PWA; Supabase + Vercel; tests; live |
| 2026-10-17 | Fixed fast-tap race (client ids, writes wait for insert) |
| 2026-10-17 | v2: redesign; due dates, repeat, lists, tags, subtasks, quick-add, search, sort |
| 2026-10-20 | v3: profile, calendar, daily email digest, drag to reorder; email setup fixed (wrong key in `RESEND_API_KEY`) |
| 2026-10-20 | Fixed checkbox flicker (instant optimistic updates, shipped with v3); stabilised e2e; full docs refresh |
| 2026-10-20 | v4: Google Calendar sync built and tested (needs migration 0004 + Google setup, see above) |
