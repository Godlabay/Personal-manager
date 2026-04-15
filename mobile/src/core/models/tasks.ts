import { supabase } from '../supabase/client';
import type { Task, TaskDraft } from './types';

/**
 * CRUD helpers for tasks. All calls run under the current user's JWT, so RLS
 * is enforced server-side — we don't need to filter by user_id client-side.
 */

export async function listInbox(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .is('project_id', null)
    .eq('status', 'open')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

/**
 * Tasks due today (local boundaries) + anything overdue still open.
 * The DB stores due_at in UTC; we let Postgres compare against the ISO window.
 */
export async function listToday(): Promise<Task[]> {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'open')
    .lte('due_at', endOfDay.toISOString())
    .order('priority', { ascending: false })
    .order('due_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function listUpcoming(days = 14): Promise<Task[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'open')
    .gte('due_at', start.toISOString())
    .lt('due_at', end.toISOString())
    .order('due_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function listByProject(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Task) ?? null;
}

export async function createTask(draft: TaskDraft): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      priority: 1,
      due_has_time: false,
      ...draft,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function completeTask(id: string): Promise<Task> {
  return updateTask(id, { status: 'done', completed_at: new Date().toISOString() });
}

export async function reopenTask(id: string): Promise<Task> {
  return updateTask(id, { status: 'open', completed_at: null });
}

export async function reschedule(id: string, dueAt: Date | null, hasTime = false): Promise<Task> {
  return updateTask(id, {
    due_at: dueAt ? dueAt.toISOString() : null,
    due_has_time: hasTime,
  });
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
