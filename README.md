# TaskFlow – Personal TODO Web App (Phone-Friendly, Hosted)

A small, fast, installable web app to store TODOs, mark/unmark them complete, give each a priority (P0–P4), and style each row with a text color and a highlight color. Hosted publicly so you can open it on your phone and "Add to Home Screen".

## Document map (read in this order)

| # | File | Purpose | Audience |
|---|------|---------|----------|
| 0 | [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md) | Master prompt + rules for an autonomous coding agent | Agent |
| 1 | [docs/01-PRD.md](docs/01-PRD.md) | What to build: requirements, user stories, acceptance criteria | Everyone |
| 2 | [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | How it is structured: layers, data model, security, components, flows | Everyone |
| 3 | [docs/03-TECH-STACK.md](docs/03-TECH-STACK.md) | Chosen stack, why, alternatives, pinned versions | Everyone |
| 4 | [docs/04-BUILD-STEPS.md](docs/04-BUILD-STEPS.md) | Step-by-step build plan with verification gates | Agent / dev |
| 5 | [docs/05-DEPLOYMENT.md](docs/05-DEPLOYMENT.md) | Hosting on Vercel + Supabase, phone install, CI | You / agent |
| 6 | [docs/06-TESTING-AND-QA.md](docs/06-TESTING-AND-QA.md) | Test plan and Definition of Done | Agent / dev |

## TL;DR

- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres + Auth + Row Level Security) + Vercel hosting. PWA for phone install.
- **Cost:** $0 on free tiers.
- **Time:** ~1 day by hand, ~1–2 hours for an agent following `04-BUILD-STEPS.md`.

## How to hand this to an agent

1. Put this whole folder in an empty project directory.
2. Create free accounts on GitHub, Supabase, Vercel (the agent cannot do signup for you).
3. Give the agent this prompt:

   > Read `README.md`, then `AGENT_INSTRUCTIONS.md`, then every file in `docs/` in order. Build the app exactly as specified, following `docs/04-BUILD-STEPS.md` step by step. Do not skip verification gates. Stop and ask me only for items listed under "Human-only actions" in `AGENT_INSTRUCTIONS.md`.

4. Supply the Supabase URL and anon key when asked (see `docs/05-DEPLOYMENT.md`).

## Assumptions (change in PRD if wrong)

- Single user per account (your own private list); email login so data syncs between laptop and phone.
- "Highlight rows text" is implemented as: each TODO has an optional **text color** and an optional **highlight color** (a marker-style background behind the title).
- Priorities are P0 (most urgent) to P4 (least).
