import { supabase } from '../supabase/client';

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

/**
 * Time tracking read helpers. Write-path lives in app/focus/index.tsx (when a
 * focus session ends) and ai/tools/* when the agent logs focus sessions.
 */

export async function listEntriesForTask(taskId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TimeEntry[];
}

export async function totalSecondsForTask(taskId: string): Promise<number> {
  const entries = await listEntriesForTask(taskId);
  return entries.reduce((a, e) => a + (e.duration_s ?? 0), 0);
}

/**
 * Sum of durations per project over a window.
 * Uses a Postgrest embed so we get the project_id via the joined task.
 */
export async function totalsByProject(sinceDays = 30): Promise<Array<{ project_id: string | null; project_name: string | null; seconds: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  const { data, error } = await supabase
    .from('time_entries')
    .select('duration_s, tasks(project_id, projects(name))')
    .gte('started_at', since.toISOString())
    .not('duration_s', 'is', null);

  if (error) throw error;

  type Row = {
    duration_s: number | null;
    tasks: { project_id: string | null; projects: { name: string } | null } | null;
  };
  const grouped = new Map<string, { project_id: string | null; project_name: string | null; seconds: number }>();
  for (const row of (data ?? []) as Row[]) {
    const pid = row.tasks?.project_id ?? null;
    const pname = row.tasks?.projects?.name ?? null;
    const key = pid ?? '__inbox__';
    const cur = grouped.get(key) ?? { project_id: pid, project_name: pname, seconds: 0 };
    cur.seconds += row.duration_s ?? 0;
    grouped.set(key, cur);
  }
  return Array.from(grouped.values()).sort((a, b) => b.seconds - a.seconds);
}
