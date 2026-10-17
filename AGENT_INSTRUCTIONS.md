# AGENT_INSTRUCTIONS.md – Master Instructions for the Building Agent

You are an autonomous software engineer. Build **TaskFlow** exactly as described in `README.md` and `docs/`. Work in the current directory.

## Operating rules

1. **Read everything first**: `README.md`, then all files in `docs/` in numeric order.
2. **Follow `docs/04-BUILD-STEPS.md` sequentially.** Every step has a *Verify* gate. Do not move on until it passes. If it fails, fix it; after 3 failed attempts on the same gate, stop and report the exact error.
3. **Do not invent scope.** Anything under "Out of scope" in the PRD stays out. Small UX details not specified: choose the simplest option and note it in `DECISIONS.md`.
4. **Pinned choices are not negotiable**: Next.js App Router, TypeScript strict, Tailwind, Supabase, no other state library or UI kit beyond what `03-TECH-STACK.md` lists.
5. **Security is mandatory**: Row Level Security on, never use the Supabase service-role key in client code, never commit `.env.local`.
6. **Commit often** (if git is available): one commit per build step, message `step N: <summary>`.
7. **Keep a log**: append to `PROGRESS.md` after each step (what was done, verification result).
8. **Mobile first**: design at 375px width first; every interactive element has a touch target of at least 44×44 px.
9. **Accessibility**: semantic HTML, labels on all inputs, visible focus ring, color is never the only indicator (priority also shown as text "P0").
10. **No placeholders left behind**: no `TODO`, lorem ipsum, or dead code at the end.

## Human-only actions (stop and ask the user for these)

| Action | Why the agent cannot do it |
|--------|----------------------------|
| Create a Supabase project and give you `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Needs account signup |
| Run the SQL migration in the Supabase SQL editor (unless the agent has the Supabase CLI logged in) | Needs project access |
| Create the Vercel project / connect GitHub repo, set env vars | Needs account login |
| Install the app on the phone | Physical device |

If the user has already provided credentials in `.env.local`, proceed without asking.

## Deliverables checklist

- [ ] Working app locally (`npm run dev`)
- [ ] `supabase/migrations/0001_init.sql` applied
- [ ] RLS verified (user A cannot read user B's rows)
- [ ] PWA installable (manifest + icons + service worker)
- [ ] Unit + component + e2e tests passing (`npm test`, `npm run e2e`)
- [ ] `npm run build` succeeds with zero type or lint errors
- [ ] Deployed to Vercel, public URL recorded in `PROGRESS.md`
- [ ] `DECISIONS.md` and `PROGRESS.md` present

## Definition of Done

See `docs/06-TESTING-AND-QA.md` section "Definition of Done". The task is complete only when every box there is ticked and reported.

## Final report format

When finished, reply with: live URL, test results summary, list of deviations from the spec (if any), and the manual steps the user must still do (phone install).
