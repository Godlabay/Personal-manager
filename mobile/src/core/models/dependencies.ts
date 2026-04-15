import { supabase } from '../supabase/client';
import type { Task } from './types';

/**
 * Task dependencies — a task is "blocked" when at least one predecessor is
 * still open. We keep the model minimal: a link table (predecessor_id,
 * successor_id). No finish-to-start vs start-to-start distinctions yet.
 *
 * We use two queries (link table + tasks lookup) rather than a Postgrest embed
 * hint because the link table has two FKs to the same `tasks` table, which
 * requires spelling out the constraint name, and ours rely on Postgres'
 * auto-generated names that aren't guaranteed across environments.
 */

export interface Dependency {
  predecessor_id: string;
  successor_id: string;
}

async function fetchTasks(ids: string[]): Promise<Task[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('tasks').select('*').in('id', ids);
  if (error) throw error;
  return (data ?? []) as Task[];
}

/** Predecessor tasks — the things that must finish before `taskId` can start. */
export async function getPredecessors(taskId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('predecessor_id')
    .eq('successor_id', taskId);
  if (error) throw error;
  const ids = ((data ?? []) as Array<{ predecessor_id: string }>).map((r) => r.predecessor_id);
  return fetchTasks(ids);
}

/** Successor tasks — the things waiting on `taskId`. */
export async function getSuccessors(taskId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('successor_id')
    .eq('predecessor_id', taskId);
  if (error) throw error;
  const ids = ((data ?? []) as Array<{ successor_id: string }>).map((r) => r.successor_id);
  return fetchTasks(ids);
}

export async function addDependency(predecessorId: string, successorId: string): Promise<void> {
  if (predecessorId === successorId) throw new Error('A task cannot depend on itself.');
  const { error } = await supabase
    .from('task_dependencies')
    .insert({ predecessor_id: predecessorId, successor_id: successorId });
  if (error) throw error;
}

export async function removeDependency(predecessorId: string, successorId: string): Promise<void> {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('predecessor_id', predecessorId)
    .eq('successor_id', successorId);
  if (error) throw error;
}

/**
 * Cheap bulk "is this task blocked?" check. Given a set of task IDs, returns
 * the subset that have at least one *open* predecessor. Used by list views
 * to render a 🔒 indicator without N round trips.
 */
export async function blockedTaskIds(taskIds: string[]): Promise<Set<string>> {
  if (taskIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('predecessor_id, successor_id')
    .in('successor_id', taskIds);
  if (error) return new Set();

  const links = (data ?? []) as Dependency[];
  if (links.length === 0) return new Set();

  const predIds = Array.from(new Set(links.map((l) => l.predecessor_id)));
  const { data: preds } = await supabase
    .from('tasks')
    .select('id, status')
    .in('id', predIds);
  const openPreds = new Set(
    ((preds ?? []) as Array<{ id: string; status: string }>).filter((p) => p.status === 'open').map((p) => p.id),
  );

  const blocked = new Set<string>();
  for (const l of links) {
    if (openPreds.has(l.predecessor_id)) blocked.add(l.successor_id);
  }
  return blocked;
}
