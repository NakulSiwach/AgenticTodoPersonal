# TaskFlow

A personal TODO app for phone and laptop: priorities (P0–P4), text colors and highlights, due
dates, repeating tasks, lists, tags, subtasks, quick-add typing, drag-to-reorder, a calendar,
an optional daily email of what's due, and optional sync of dated tasks to Google Calendar. Installable as an app (PWA). Runs entirely on free
tiers.

- **Live:** https://agentic-todo-personal.vercel.app
- **Stack:** Next.js 16 + React 19 + TypeScript + Tailwind 4 · Supabase (Postgres, Auth, Row
  Level Security) · Vercel · Resend (email) · Google Calendar API · GitHub Actions (scheduler)
- **Repo:** https://github.com/NakulSiwach/AgenticTodoPersonal, branch `master` (auto-deploys)

## Start here

| If you are… | Read |
|-------------|------|
| An AI agent changing this app | [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md), then the docs below |
| The owner | [PROJECT_STATUS.md](PROJECT_STATUS.md) |

## Documentation

| File | What's in it |
|------|--------------|
| [docs/01-PRD.md](docs/01-PRD.md) | Every shipped feature, known limits, ideas backlog |
| [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | **The reference.** Routes, folder map, data model, security, optimistic data flow, views/sorting, ordering, quick-add, dates, email digest, UI system, PWA, env vars |
| [docs/03-TECH-STACK.md](docs/03-TECH-STACK.md) | Libraries and versions, rules for dependencies, npm scripts |
| [docs/05-DEPLOYMENT.md](docs/05-DEPLOYMENT.md) | Shipping changes, migrations, configuration, verification, troubleshooting, key rotation |
| [docs/06-TESTING-AND-QA.md](docs/06-TESTING-AND-QA.md) | Test inventory, how to run, conventions and gotchas |
| [docs/07-ADDING-FEATURES.md](docs/07-ADDING-FEATURES.md) | Step-by-step recipes: new field, enum, view, sort, setting, API route, scheduled job; definition of done |
| [docs/04-BUILD-STEPS.md](docs/04-BUILD-STEPS.md) | Historical: the original from-scratch build plan (v1) |
| [DECISIONS.md](DECISIONS.md) | Why things are the way they are (read before "fixing" something odd) |
| [PROGRESS.md](PROGRESS.md) | Build log per version with verification evidence |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Owner-facing status and to-dos |

## Run locally
```bash
npm install
cp .env.example .env.local      # fill in Supabase URL + anon key (email vars optional)
npm run dev                     # http://localhost:3000
npm test && npm run typecheck && npm run lint
```
Database: run the files in `supabase/migrations/` in order in the Supabase SQL editor.
