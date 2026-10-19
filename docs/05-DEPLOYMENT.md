# 05 – Deployment, Operations and Troubleshooting

Live: https://agentic-todo-personal.vercel.app · Repo: https://github.com/NakulSiwach/AgenticTodoPersonal
(public, branch `master`) · Supabase project ref: `rjjchnqajfhmpivimcag`.

## 1. How a change reaches production
1. Change code locally; `npm run typecheck && npm run lint && npm test` (and `npm run e2e` for core flows).
2. Commit and `git push` to `master`. **Vercel builds and deploys every push to `master`**
   (1–2 min). A failed build keeps the previous version live.
3. GitHub Actions `ci` runs lint/typecheck/test/build on the same push (it does not block Vercel).
4. Hard-refresh the app. The service worker may serve old static files on the first load.

The owner asked for **few pushes**: batch work and push at milestones.

## 2. Database changes
Migrations in `supabase/migrations/` are applied **by hand** in the Supabase SQL editor
(https://supabase.com/dashboard/project/rjjchnqajfhmpivimcag/sql/new), in numeric order.
- Never edit an applied migration; add `000N_<name>.sql`.
- Write them additive and re-runnable (`if not exists`, `drop … if exists` before `create policy`).
- Apply the migration **before** pushing code that uses it. For renames/removals, do two
  releases (add new → switch code → remove old later).
- Applied so far: `0001_init`, `0002_features`, `0003_profile_and_order`.

To check which columns exist without dashboard access, sign in as a test user with supabase-js
and `select('<col>')`; a missing column returns a "schema cache" error.

## 3. Configuration

### Vercel → Project → Settings → Environment Variables
| Name | Env | Value |
|------|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Prod + Preview | `https://rjjchnqajfhmpivimcag.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod + Preview | Supabase anon (public) key, `eyJ…` |
| `NEXT_PUBLIC_SITE_URL` | Prod + Preview | `https://agentic-todo-personal.vercel.app` |
| `RESEND_API_KEY` | Prod | Resend key, **starts with `re_`** |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod | Supabase service_role key (`eyJ…`) or a new `sb_secret_…` key. Secret |
| `CRON_SECRET` | Prod | long random string, identical to the GitHub secret |
| `EMAIL_FROM` | optional | e.g. `TaskFlow <hello@yourdomain.com>`, needs a verified Resend domain |

**Changing a variable does nothing until you redeploy:** Deployments → ⋯ on the latest →
Redeploy.

### GitHub → Settings → Secrets and variables → Actions
`CRON_SECRET` (same as Vercel), `APP_URL` = `https://agentic-todo-personal.vercel.app`
(no trailing slash).

### Supabase
- Authentication → Providers → Email: **Confirm email OFF**.
- Authentication → URL Configuration: Site URL = the Vercel URL; redirect URLs
  `https://agentic-todo-personal.vercel.app/**`, `http://localhost:3000/**`.

### Local `.env.local` (git-ignored)
Same names as `.env.example`. The cron secret here does **not** need to match production.

## 4. Verifying production
```bash
B=https://agentic-todo-personal.vercel.app
curl -s -o /dev/null -w "%{http_code}\n" $B/login            # 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" $B/  # 307 → /login
curl -s $B/api/cron/digest                                    # {"error":"Unauthorized"} → route exists
curl -sI $B/login | grep -i x-frame                           # DENY
E2E_BASE_URL=$B E2E_EMAIL=… E2E_PASSWORD=… npm run e2e        # full browser test on prod
```
Scheduler: GitHub → Actions → Daily digest → Run workflow. Success log:
`{"checked":N,"sent":0,"skipped":N,"failed":0}`.
Email: Profile → Notifications → Send me a test email now.

## 5. Troubleshooting (real incidents first)

| Symptom | Cause | Fix |
|---------|-------|-----|
| Test email: `Email provider rejected the message (401): Unsupported alg HS256; only ES256 is accepted` | `RESEND_API_KEY` in Vercel holds a **Supabase** key (`eyJ…`) | Put the `re_…` Resend key there, then **redeploy** |
| Still the same error after fixing the variable | No redeploy since the change | Redeploy |
| Workflow red, `curl: (22) … 401` | `CRON_SECRET` differs between GitHub and Vercel (or Vercel not redeployed) | Set the same value in both, redeploy |
| Workflow red, `… 503` | `CRON_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` missing in Vercel | Add, redeploy |
| Workflow green but says "Set the APP_URL and CRON_SECRET…" | GitHub secrets missing | Add them |
| Test email: Resend 403 "only send testing emails to your own email" | Using `onboarding@resend.dev` to an address other than the Resend account owner | Use the same address, or verify a domain + `EMAIL_FROM` |
| UI: "Database needs the latest update: run …sql" | Migration not applied | Run that file in the SQL editor |
| Everything fails, Supabase dashboard says paused | Free project idle ~7 days | Restore project |
| Digest never arrives, test email works | Workflow disabled (60 days idle), secrets wrong, or no open tasks due today/overdue (nothing is sent then) | Check Actions tab; run it by hand |
| Old UI after deploy | Service worker cached static files | Reload once more / reopen the app |
| Login works locally but email links fail | URL not in Supabase redirect list | Add it (§3) |

## 6. Rollback
Vercel → Deployments → pick a good one → ⋯ → Promote to Production. Then fix forward with a new
commit. Database migrations are not rolled back automatically; write a new migration if needed.

## 7. Key rotation
- Resend: create a new key, update Vercel, redeploy, delete the old key in Resend.
- `CRON_SECRET`: change in both Vercel and GitHub, redeploy.
- Supabase service role: create a **secret key** (`sb_secret_…`) under Settings → API Keys →
  Publishable and secret API keys, put it in `SUPABASE_SERVICE_ROLE_KEY`, redeploy. Disabling the
  legacy JWT keys also disables the legacy **anon** key, so first switch
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` to a publishable key (`sb_publishable_…`), redeploy, verify, then disable.

## 8. Costs and limits (all free)
Vercel Hobby (personal use), Supabase Free (500 MB DB; pauses when idle; no automatic backups,
so export tables occasionally), GitHub Actions (free for public repos), Resend Free (daily and
monthly send caps, far above one digest a day).

## 9. Migration 0005 (reminders + quote)
Run `supabase/migrations/0005_reminders_and_quotes.sql` in the SQL editor. It is independent of
0004 (Google Calendar), so either can go first. Until it runs, the Reminders view shows "Database
needs the latest update", the email is sent without reminders, and the quote setting can't be
changed (the quote is on by default).
