# 01 – Product Requirements (PRD)

## 1. Goal

A personal TODO app, usable on phone and desktop, with data stored in the cloud so it is the same everywhere.

## 2. Users

One person (the owner). Each account sees only its own TODOs. Multiple accounts are technically supported (isolated by RLS) but there is no sharing.

## 3. User stories and acceptance criteria

### US-1 Sign in
As a user I can sign in with email + password (or magic link) so my list is private and synced.
- AC1: Unauthenticated visitors are redirected to `/login`.
- AC2: After login I land on `/` (the list).
- AC3: Sign out is reachable from the header menu.
- AC4: Session persists across browser restarts.

### US-2 Add a TODO
- AC1: A fixed input bar at the bottom (thumb reachable on phone) with title field, priority picker (default P2), and Add button.
- AC2: Empty/whitespace titles are rejected with an inline message.
- AC3: Title max 200 chars.
- AC4: New item appears instantly (optimistic) and persists after refresh.

### US-3 Complete / uncomplete
- AC1: A checkbox (44px touch target) toggles completion.
- AC2: Completed items show strikethrough and reduced opacity but keep their chosen colors visible.
- AC3: Toggling back un-completes it (`completed_at` cleared).
- AC4: Change is optimistic; on server error it reverts and shows a toast.

### US-4 Priority
- AC1: Priorities: **P0, P1, P2, P3, P4** (P0 = most urgent).
- AC2: Each row shows a badge with the label text and a distinct color.
- AC3: Priority can be changed after creation (tap badge → menu).
- AC4: Default list order: incomplete first, then by priority ascending (P0 first), then newest first. Completed items sink to the bottom.

### US-5 Text color
- AC1: Per-TODO text color chosen from a fixed palette of 8 options plus "Default".
- AC2: The palette is theme-safe (readable on light and dark backgrounds).
- AC3: Stored as a palette key, not a raw hex.

### US-6 Highlight
- AC1: Per-TODO highlight (marker background behind the title text) chosen from a fixed palette of 6 options plus "None".
- AC2: Text remains readable (contrast ratio >= 4.5:1) for every text-color x highlight combination offered; where a combo fails, the picker disables it.

### US-7 Edit and delete
- AC1: Tap the title (or an edit icon) to edit title, notes, priority, text color, highlight in a bottom sheet.
- AC2: Delete requires one confirmation (or offers an "Undo" toast for 5 s).

### US-8 Filter and view
- AC1: Filter chips: All / Active / Completed.
- AC2: Priority filter: All, P0, P1, P2, P3, P4.
- AC3: Counter shows "N active".

### US-9 Installable on phone
- AC1: Valid PWA manifest; "Add to Home Screen" works on Android Chrome and iOS Safari.
- AC2: Opens full-screen with an app icon and theme color.
- AC3: App shell loads offline (list requires network; shows a friendly offline message).

### US-10 Dark mode
- AC1: Follows the system preference; no manual toggle required (optional toggle allowed).

## 4. Data fields per TODO

| Field | Type | Rules |
|-------|------|-------|
| id | uuid | generated |
| user_id | uuid | owner, from auth |
| title | text | 1–200 chars |
| notes | text | optional, max 2000 |
| priority | smallint | 0–4 |
| completed | boolean | default false |
| completed_at | timestamptz | set when completed |
| text_color | text | palette key or null |
| highlight_color | text | palette key or null |
| created_at / updated_at | timestamptz | automatic |

## 5. Palettes (keys are stored in DB)

Text colors: `default, red, orange, amber, green, teal, blue, purple, pink`
Highlight colors: `none, yellow, green, blue, pink, orange, purple`
Priority colors: P0 red, P1 orange, P2 yellow/amber, P3 blue, P4 gray.

Exact CSS values live in `src/lib/palette.ts` (see Architecture §7).

## 6. Non-functional requirements

- Performance: first load < 2 s on 4G; Lighthouse performance >= 90, PWA and accessibility >= 90.
- Responsive: 360px to desktop; single column max-width 640px centered.
- Security: RLS on all tables; HTTPS only; input validated client and server side (zod + DB constraints).
- Browser support: latest Chrome, Safari (iOS 16+), Firefox, Edge.

## 7. Out of scope (do NOT build)

Sharing/collaboration, due dates and reminders/push notifications, subtasks, tags/projects, drag-and-drop reordering, attachments, native apps, i18n. (Listed in the roadmap in `02-ARCHITECTURE.md` §12.)
