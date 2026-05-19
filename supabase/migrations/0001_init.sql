-- Personal Manager — initial schema (Phase 1)
-- Idempotent: uses IF NOT EXISTS where possible.

set check_function_bodies = off;

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================================
-- Enums
-- =========================================================================

do $$ begin
  create type task_status as enum ('open', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type energy_level as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_view_mode as enum ('list', 'kanban', 'gantt', 'calendar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reminder_kind as enum ('time', 'location');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_message_role as enum ('user', 'assistant', 'tool', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_member_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- Helper: updated_at trigger
-- =========================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- user_profile
-- =========================================================================

create table if not exists user_profile (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  locale           text default 'fr',
  tz               text default 'America/Toronto',
  karma            int not null default 0,
  current_streak   int not null default 0,
  longest_streak   int not null default 0,
  preferences      jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
drop trigger if exists trg_user_profile_updated_at on user_profile;
create trigger trg_user_profile_updated_at before update on user_profile
  for each row execute function set_updated_at();

-- =========================================================================
-- projects
-- =========================================================================

create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  color        text,             -- hex like "#FF8A3D"
  icon         text,             -- SF Symbol name
  view_mode    project_view_mode not null default 'list',
  archived     boolean not null default false,
  sort_order   double precision not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_projects_user on projects(user_id, sort_order);
drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();

-- =========================================================================
-- sections
-- =========================================================================

create table if not exists sections (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  name         text not null,
  sort_order   double precision not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_sections_project on sections(project_id, sort_order);
drop trigger if exists trg_sections_updated_at on sections;
create trigger trg_sections_updated_at before update on sections
  for each row execute function set_updated_at();

-- =========================================================================
-- labels
-- =========================================================================

create table if not exists labels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists idx_labels_user on labels(user_id);

-- =========================================================================
-- tasks
-- =========================================================================

create table if not exists tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  project_id         uuid references projects(id) on delete set null,          -- null = Inbox
  section_id         uuid references sections(id) on delete set null,
  parent_task_id     uuid references tasks(id) on delete cascade,
  title              text not null,
  description        text,
  priority           smallint not null default 1 check (priority between 1 and 4),
  due_at             timestamptz,
  due_has_time       boolean not null default false,
  recurrence_rrule   text,
  status             task_status not null default 'open',
  kanban_column      text,
  estimated_minutes  int,
  energy_level       energy_level,
  sort_order         double precision not null default 0,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_tasks_user_due     on tasks(user_id, due_at);
create index if not exists idx_tasks_user_proj    on tasks(user_id, project_id, sort_order);
create index if not exists idx_tasks_user_status  on tasks(user_id, status, priority);
create index if not exists idx_tasks_parent       on tasks(parent_task_id);
drop trigger if exists trg_tasks_updated_at on tasks;
create trigger trg_tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

-- =========================================================================
-- task_labels (m2m)
-- =========================================================================

create table if not exists task_labels (
  task_id   uuid not null references tasks(id) on delete cascade,
  label_id  uuid not null references labels(id) on delete cascade,
  primary key (task_id, label_id)
);
create index if not exists idx_task_labels_label on task_labels(label_id);

-- =========================================================================
-- comments
-- =========================================================================

create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_comments_task on comments(task_id, created_at);

-- =========================================================================
-- attachments
-- =========================================================================

create table if not exists attachments (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references tasks(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  storage_path  text not null,
  mime          text,
  size          bigint,
  created_at    timestamptz not null default now()
);
create index if not exists idx_attachments_task on attachments(task_id);

-- =========================================================================
-- time_entries
-- =========================================================================

create table if not exists time_entries (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references tasks(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null,
  ended_at    timestamptz,
  duration_s  int,
  kind        text default 'focus',   -- 'focus' | 'manual'
  ambience    text,                    -- preset id when coming from a focus session
  created_at  timestamptz not null default now()
);
create index if not exists idx_time_entries_user on time_entries(user_id, started_at desc);

-- =========================================================================
-- reminders
-- =========================================================================

create table if not exists reminders (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references tasks(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          reminder_kind not null,
  fire_at       timestamptz,
  geo_lat       double precision,
  geo_lng       double precision,
  geo_radius_m  int,
  notif_id      text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_reminders_task on reminders(task_id);
create index if not exists idx_reminders_fire on reminders(user_id, fire_at);

-- =========================================================================
-- task_dependencies
-- =========================================================================

create table if not exists task_dependencies (
  predecessor_id  uuid not null references tasks(id) on delete cascade,
  successor_id    uuid not null references tasks(id) on delete cascade,
  primary key (predecessor_id, successor_id),
  check (predecessor_id <> successor_id)
);

-- =========================================================================
-- saved_filters
-- =========================================================================

create table if not exists saved_filters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  query       jsonb not null,
  sort_order  double precision not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_saved_filters_user on saved_filters(user_id, sort_order);

-- =========================================================================
-- ai_conversations + ai_messages
-- =========================================================================

create table if not exists ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_ai_conv_user on ai_conversations(user_id, updated_at desc);
drop trigger if exists trg_ai_conv_updated_at on ai_conversations;
create trigger trg_ai_conv_updated_at before update on ai_conversations
  for each row execute function set_updated_at();

create table if not exists ai_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references ai_conversations(id) on delete cascade,
  role             ai_message_role not null,
  content          jsonb,              -- text or structured content
  tool_name        text,
  tool_args        jsonb,
  tool_result      jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists idx_ai_messages_conv on ai_messages(conversation_id, created_at);

-- =========================================================================
-- project_members (Phase 3 UI; schema ready now to avoid migration pain)
-- =========================================================================

create table if not exists project_members (
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        project_member_role not null default 'editor',
  added_at    timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists idx_project_members_user on project_members(user_id);

-- =========================================================================
-- realtime publication
-- =========================================================================

do $$ begin
  alter publication supabase_realtime add table tasks, projects, sections, labels, task_labels, comments, reminders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
