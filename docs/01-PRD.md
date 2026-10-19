# 01 – Product Requirements (current)

TaskFlow is a personal TODO app that works the same on phone and laptop, stores data in the
cloud, installs to the home screen, and can email you each morning. One user per account;
no sharing.

Status legend: ✅ shipped (v1 = basics, v2 = organisation, v3 = profile/email/reorder,
v4 = Google Calendar sync).

## 1. Feature list

### Accounts
- ✅ v1 Email + password sign-up and sign-in (email confirmation is off). Session persists.
- ✅ v1 Every page except `/login` requires sign-in. Sign out from the avatar menu.
- ✅ v3 Display name (Profile → Account), used in the email greeting.

### Tasks
- ✅ v1 Add a task: title 1–200 chars; empty titles rejected inline. Appears instantly.
- ✅ v1 Mark / unmark complete with a large checkbox. Finished tasks move to a "Completed" section.
- ✅ v1 Priority **P0–P4** (P0 = urgent). Badge with text + color; checkbox ring tinted by priority.
  Change from the row badge or the editor.
- ✅ v1 **Text color** (8 options + default) and **highlight** (6 options + none) per task.
  Combinations that fail WCAG contrast in light or dark mode are disabled.
- ✅ v1 Edit everything in a sheet (bottom on phone, side panel on desktop).
- ✅ v1 Delete with a 5-second **Undo**. "Delete all completed" in the Completed view.
- ✅ v2 Notes (≤ 2000 chars).
- ✅ v2 **Due date** with quick picks; colored labels (Overdue red, Today green, soon orange).
- ✅ v2 **Repeat**: daily, weekdays, weekly, monthly, yearly. Completing a repeating task moves
  it to its next date instead of closing it (with Undo).
- ✅ v2 **Lists** (one per task; none = Inbox) and **tags** (≤ 10 per task, quick tag chips).
- ✅ v2 **Subtasks** (≤ 50) with their own checkboxes and progress count.
- ✅ v2 **Quick-add** typing: `Pay rent tomorrow !1 #Home @bills every month`.

### Finding and organising
- ✅ v2 Views in the sidebar with counts: Inbox, Today (incl. overdue, with progress bar),
  Upcoming, All tasks, Completed, each List, each Tag.
- ✅ v2 Search across title, notes, list, tags and subtasks (searches all tasks, not one view).
- ✅ v2 Sort: Priority (default), Manual order, Group by date, Due date, Newest, A–Z.
- ✅ v2 Filter by priority.
- ✅ v3 **Drag to reorder** (mouse, touch, keyboard). In Priority sort, only within a priority.
- ✅ v2 Keyboard shortcuts: `n`/`q` new task, `/` search, `Esc` close.

### Profile (`/profile`)
- ✅ v3 **Calendar** tab: month grid; tasks shown on their due date (or completion day if
  undated) as done / pending / overdue; month totals; tap a day to list its tasks.
- ✅ v3 **Notifications** tab: daily email digest on/off, delivery time (presets or any time),
  detected timezone, "Send me a test email now".
- ✅ v3 **Account** tab: email (read-only), display name.

### Daily email digest
- ✅ v3 Once per local day, within ~15 minutes after the chosen time, email the open tasks that are
  due today or overdue, grouped by priority. Nothing pending → no email.
- ✅ v3 Never sent twice on the same day, even if the scheduler overlaps; failed sends retry on
  the next run (up to 3 hours after the chosen time).

### Google Calendar sync (v4)
- ✅ v4 Profile → Calendar → **Connect Google Calendar** (Google sign-in). TaskFlow creates its own
  **"TaskFlow" calendar** in the user's Google account and can access only that calendar
  (`calendar.app.created` scope). It can't see the user's other events.
- ✅ v4 Every task with a due date becomes an all-day event: title, colored by priority, marked free
  (doesn't block the day), description with priority, list, tags, subtasks, notes and a link to
  the app. Repeating tasks use a matching Google repeat rule. Finished tasks stay as "✓ Title" in
  grey. Removing a task or its due date removes the event.
- ✅ v4 One-way: TaskFlow → Google. Changes push ~3 s after the last edit (immediately if the app is
  closed or backgrounded), and a background job re-syncs every ~15 minutes as a safety net.
  Events edited in Google are overwritten on the next change; events the user adds to the
  TaskFlow calendar by hand are left alone.
- ✅ v4 "Sync now", last-synced time, error message with a Reconnect link, and Disconnect (optionally
  deleting the TaskFlow calendar from Google).

### App shell
- ✅ v1 Installable PWA (Android "Install app", iOS "Add to Home Screen"), offline page.
- ✅ v2 Theme: System / Light / Dark toggle (top right), no flash on load.
- ✅ v2 Responsive: fixed sidebar ≥ 768 px; slide-in menu on phones. No horizontal scroll at 360 px.

## 2. Non-functional requirements
- Free to run: Vercel Hobby, Supabase Free, GitHub (public repo), Resend Free.
- Every tap feels instant (optimistic UI); server failures roll back with a toast.
- Data isolation by Row Level Security; service-role key only on the server.
- Accessible: labelled controls, keyboard support, 44 px touch targets, color never the only cue.
- Tested: unit + component (Vitest), end-to-end (Playwright, phone + desktop viewports).

## 3. Known limits
- Resend's shared sender only delivers to the Resend account owner's address until a domain is
  verified. Multiple users of one deployment need a verified domain + `EMAIL_FROM`.
- Supabase Free pauses after ~1 week idle (Restore in the dashboard; data kept).
- GitHub disables scheduled workflows after 60 days without repo activity.
- Offline: the app shell loads, but tasks need a connection (no offline queue).
- No password reset UI yet (Supabase supports it; needs a page + redirect URL).
- Google Calendar sync is one-way (edits in Google don't come back). Monthly repeats on the 29th–31st
  can differ: TaskFlow moves to the month's last day; Google skips short months.
- Google OAuth app left in "Testing" mode expires the connection every 7 days. Publish it (unverified
  is fine for personal use; up to 100 users) to avoid that.

## 4. Ideas backlog (not built)
Export/backup (JSON/CSV), password reset page, shared lists, reminders/push notifications, due
*times*, natural-language dates in more forms, recurring rules like "every 2nd Tuesday", task
archive, bulk actions, offline write queue, list colors/icons, attachments, i18n.
See [07-ADDING-FEATURES.md](07-ADDING-FEATURES.md) for how to build them.
