import { supabase } from '../supabase/client';
import type { Task } from './types';

/**
 * Search helpers for tasks. We keep the surface tiny on purpose — Phase 2
 * only needs title + optional priority/status/due filters. Free-text search
 * uses Postgres ILIKE (no FTS index yet — <10k tasks is the assumption).
 */

export interface SearchOptions {
  query?: string;
  priority?: 1 | 2 | 3 | 4;
  status?: 'open' | 'done' | 'cancelled';
  /** When true, only tasks that actually have a due_at. */
  withDue?: boolean;
  projectId?: string | null;
  limit?: number;
}

export async function searchTasks(opts: SearchOptions): Promise<Task[]> {
  let q = supabase.from('tasks').select('*').limit(opts.limit ?? 100);

  if (opts.query && opts.query.trim().length > 0) {
    // escape % and _ so special chars are literal; then wrap in %…%
    const escaped = opts.query.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
    q = q.ilike('title', `%${escaped}%`);
  }
  if (opts.priority != null) q = q.eq('priority', opts.priority);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.withDue) q = q.not('due_at', 'is', null);
  if (opts.projectId !== undefined) {
    q = opts.projectId === null ? q.is('project_id', null) : q.eq('project_id', opts.projectId);
  }

  q = q.order('priority', { ascending: false }).order('due_at', { ascending: true, nullsFirst: false });

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Task[];
}
