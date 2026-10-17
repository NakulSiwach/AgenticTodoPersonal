# 05 – Deployment and Phone Access

Goal: a public HTTPS URL (e.g. `https://taskflow-yourname.vercel.app`) that works on your phone and can be installed like an app.

## 1. Supabase setup (one time)

1. supabase.com → **New project** (pick a region near you, save the DB password).
2. **SQL Editor** → paste `supabase/migrations/0001_init.sql` → Run.
3. **Project Settings → API**: copy **Project URL** and **anon public key**. (Never use or share the `service_role` key.)
4. **Authentication → Providers → Email**: enabled. For a personal app, you may turn off "Confirm email" to sign in immediately.
5. **Authentication → URL Configuration**:
   - Site URL: your Vercel URL (set after step 3; use `http://localhost:3000` until then)
   - Redirect URLs: `http://localhost:3000/**` and `https://<your-app>.vercel.app/**`

## 2. Local run

```
cp .env.example .env.local     # fill in the 3 variables
npm install
npm run dev                    # http://localhost:3000
```

To test on the phone before deploying: connect both devices to the same Wi-Fi, run `npm run dev -- -H 0.0.0.0`, open `http://<your-PC-LAN-IP>:3000` on the phone. (Service worker / install need HTTPS, so full PWA testing happens on the deployed URL.)

## 3. GitHub

```
git init && git add . && git commit -m "TaskFlow"
git branch -M main
git remote add origin https://github.com/<you>/taskflow.git
git push -u origin main
```

## 4. Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo (framework auto-detected: Next.js).
2. **Environment Variables** (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
3. Deploy. Every push to `main` auto-redeploys.
4. Copy the production URL back into Supabase **Site URL / Redirect URLs** (section 1, step 5). Redeploy if you changed `NEXT_PUBLIC_SITE_URL`.
5. Optional: custom domain under Vercel → Settings → Domains.

## 5. Install on your phone

**Android (Chrome):** open the URL → sign in → menu (⋮) → *Install app* / *Add to Home screen*.
**iPhone (Safari):** open the URL in Safari → Share → *Add to Home Screen* → Add.

You will get a TaskFlow icon; it opens full-screen. Sign in once; the session persists.

## 6. Verify production

- [ ] `https://<url>` loads over HTTPS
- [ ] Sign up/in works; todo created on phone shows on desktop after refresh
- [ ] Response headers include `x-content-type-options: nosniff`
- [ ] Lighthouse mobile: Performance >= 90, PWA installable

## 7. Operations notes

- **Backups:** Supabase free tier has no automatic backups; run occasionally `Table editor → Export CSV`, or add a "Export JSON" button later.
- **Inactivity pause:** a free Supabase project pauses after about a week of no use; open the dashboard and click Restore.
- **Rotating keys:** if the anon key leaks, it is low risk (RLS), but you can reset JWT secret in Supabase and update Vercel env vars.
- **Rollback:** Vercel → Deployments → previous deployment → *Promote to Production*.
- **Migrations going forward:** add `0002_*.sql` files; apply in the SQL editor (or Supabase CLI `supabase db push`).

## 8. CI (GitHub Actions)

`.github/workflows/ci.yml`:
```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: dummy
```
