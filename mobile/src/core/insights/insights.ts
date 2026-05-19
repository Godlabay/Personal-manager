import { supabase } from '../supabase/client';

/**
 * Lightweight analytics aggregates. All queries scoped to the current user via
 * RLS; we never filter by user_id client-side.
 *
 * Not a chart lib — just shapes data so the Insights screen can draw bars/rows
 * using plain Views. Keeps Phase 3 free of heavy native deps.
 */

export interface DayBucket {
  /** YYYY-MM-DD in the user's local tz. */
  day: string;
  completed: number;
  created: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Per-day completions + creations over the last N days (inclusive of today).
 * We pull the raw completed_at / created_at columns and bucket locally so the
 * boundaries match the user's wall-clock tz (Postgres date_trunc would use UTC).
 */
export async function dailyActivity(days = 14): Promise<DayBucket[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [{ data: done }, { data: created }] = await Promise.all([
    supabase.from('tasks').select('completed_at').gte('completed_at', since.toISOString()).not('completed_at', 'is', null),
    supabase.from('tasks').select('created_at').gte('created_at', since.toISOString()),
  ]);

  const buckets = new Map<string, DayBucket>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(dayKey(d), { day: dayKey(d), completed: 0, created: 0 });
  }

  for (const row of (done ?? []) as Array<{ completed_at: string }>) {
    const key = dayKey(new Date(row.completed_at));
    const b = buckets.get(key);
    if (b) b.completed++;
  }
  for (const row of (created ?? []) as Array<{ created_at: string }>) {
    const key = dayKey(new Date(row.created_at));
    const b = buckets.get(key);
    if (b) b.created++;
  }

  return Array.from(buckets.values());
}

export interface EnergyBreakdown {
  low: number;
  medium: number;
  high: number;
  unset: number;
}

/** Count of open tasks by energy_level. Useful for "what's in my plate" overview. */
export async function energyBreakdown(): Promise<EnergyBreakdown> {
  const { data } = await supabase
    .from('tasks')
    .select('energy_level')
    .eq('status', 'open');
  const out: EnergyBreakdown = { low: 0, medium: 0, high: 0, unset: 0 };
  for (const row of (data ?? []) as Array<{ energy_level: string | null }>) {
    if (row.energy_level === 'low') out.low++;
    else if (row.energy_level === 'medium') out.medium++;
    else if (row.energy_level === 'high') out.high++;
    else out.unset++;
  }
  return out;
}

export interface CompletionRate {
  completedLast7: number;
  createdLast7: number;
  rate: number; // 0..1
}

/** Completion rate over a rolling window — not a judgment, just a mirror. */
export async function completionRate(days = 7): Promise<CompletionRate> {
  const buckets = await dailyActivity(days);
  const completed = buckets.reduce((a, b) => a + b.completed, 0);
  const created = buckets.reduce((a, b) => a + b.created, 0);
  const rate = created === 0 ? 0 : Math.min(1, completed / created);
  return { completedLast7: completed, createdLast7: created, rate };
}
