# Data Model

See `supabase/migrations/0001_init.sql` for the canonical DDL.

## Tables

### user_profile
One row per auth user. Stores display name, locale, timezone, Karma, streaks, and a free-form `preferences` JSON (theme, default project view, energy-at-time-of-day, etc.).

### projects
Top-level container. `view_mode` is the user's preferred display for that project (`list` / `kanban` / `gantt` / `calendar`). Phase 1 only renders `list`.

### sections
Optional grouping inside a project (Todoist "sections").

### tasks
Core entity.
- `parent_task_id` gives N-level subtasks.
- `priority` 1 (low) .. 4 (urgent). Todoist uses P1=urgent; we invert internally and map at the edges.
- `due_at` is `timestamptz`; `due_has_time` distinguishes "Tuesday" from "Tuesday at 10am".
- `recurrence_rrule` is iCalendar RRULE (Phase 2).
- `status`: open | done | cancelled.
- `kanban_column` is a free-form string; each project picks its own column names (Phase 2).
- `estimated_minutes` and `energy_level` fuel the ADHD-smart scheduling (`what_should_i_do_now`).

### labels + task_labels
Classic many-to-many tags.

### comments, attachments, time_entries
Self-explanatory; UI arrives in Phase 2/3.

### reminders
`kind = 'time'` fires via `UNUserNotificationCenter` locally. `kind = 'location'` waits for Phase 2 (CoreLocation).

### task_dependencies
Directed edges `predecessor_id → successor_id`. Phase 3 feature.

### saved_filters
`query` is JSON describing the filter tree (e.g. `{ "all": [ { "priority": 4 }, { "overdue": true } ] }`).

### ai_conversations + ai_messages
The agent panel persists the conversation history in the user's own DB (RLS-scoped). Each tool call is logged as an `ai_messages` row with role `tool`.

### project_members
Created now, unused in Phase 1. In Phase 3, enables shared projects.

## RLS

Every table has RLS enabled. The pattern is uniform:

```sql
create policy own_rows on <table>
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

Child tables (sections, comments, attachments, reminders, time_entries, task_labels, task_dependencies, ai_messages) reach up through the parent:

```sql
create policy own_rows on sections
  for all
  using (exists (
    select 1 from projects p
    where p.id = sections.project_id and p.user_id = auth.uid()
  ));
```

## Indexes

Beyond the implicit PK indexes:

- `tasks (user_id, due_at)` — Today / Upcoming views
- `tasks (user_id, project_id, sort_order)` — Project list
- `tasks (user_id, status, priority)` — filters
- `tasks (user_id, parent_task_id)` — subtasks
- `ai_messages (conversation_id, created_at)` — chat history

## Realtime

We enable Postgres Realtime on the user's own rows in:
`tasks`, `projects`, `sections`, `labels`, `task_labels`, `comments`.
The client subscribes with `user_id = auth.uid()` filter.
