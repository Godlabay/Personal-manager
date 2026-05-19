/**
 * Data contracts — kept in sync with supabase/migrations/0001_init.sql.
 * Fields use snake_case because that's what Postgrest returns; we keep the
 * wire format throughout the app instead of translating at every layer.
 */

export type TaskStatus = 'open' | 'done' | 'cancelled';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type ProjectViewMode = 'list' | 'kanban' | 'gantt' | 'calendar';
export type ReminderKind = 'time' | 'location';
export type AIMessageRole = 'user' | 'assistant' | 'tool' | 'system';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  view_mode: ProjectViewMode;
  archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  section_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  priority: 1 | 2 | 3 | 4;
  due_at: string | null;
  due_has_time: boolean;
  recurrence_rrule: string | null;
  status: TaskStatus;
  kanban_column: string | null;
  estimated_minutes: number | null;
  energy_level: EnergyLevel | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields the user can set when creating a task. Everything else is server-assigned. */
export type TaskDraft = Partial<
  Pick<
    Task,
    | 'project_id'
    | 'section_id'
    | 'parent_task_id'
    | 'description'
    | 'priority'
    | 'due_at'
    | 'due_has_time'
    | 'recurrence_rrule'
    | 'estimated_minutes'
    | 'energy_level'
    | 'sort_order'
  >
> & {
  title: string;
};

export interface Reminder {
  id: string;
  task_id: string;
  user_id: string;
  kind: ReminderKind;
  fire_at: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  geo_radius_m: number | null;
  notif_id: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string | null;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_s: number | null;
  kind: string;
  ambience: string | null;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string | null;
  started_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: AIMessageRole;
  content: unknown;
  tool_name: string | null;
  tool_args: unknown;
  tool_result: unknown;
  created_at: string;
}
