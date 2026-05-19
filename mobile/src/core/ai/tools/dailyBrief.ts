import { supabase } from '../../supabase/client';
import type { AgentTool } from './index';

/**
 * daily_brief — summarises what's on the user's plate: today + overdue + "one
 * thing right now" pick. The LLM uses this to give a warm morning briefing.
 *
 * The tool itself doesn't generate prose — it returns structured data that the
 * LLM formats. Keeps the tool deterministic and cheap.
 */
export const dailyBriefTool: AgentTool = {
  schema: {
    name: 'daily_brief',
    description:
      'Return a structured snapshot of today\'s tasks, overdue tasks, and a suggested "one thing now" based on user energy. Use this once per conversation when the user asks for a morning overview or "what should I do today".',
    parameters: {
      type: 'object',
      properties: {
        energy: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Current user energy level (ask them if unknown). Filters the "one thing now" pick.',
        },
        available_minutes: { type: 'number', description: 'Rough minutes the user has available now.' },
      },
      required: [],
    },
  },

  async execute(input) {
    const energy = (input.energy as 'low' | 'medium' | 'high' | undefined) ?? undefined;
    const available = (input.available_minutes as number | undefined) ?? undefined;

    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [{ data: today }, { data: overdue }] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, priority, due_at, estimated_minutes, energy_level')
        .eq('status', 'open')
        .gte('due_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
        .lte('due_at', endOfToday.toISOString())
        .order('priority', { ascending: false })
        .limit(20),
      supabase
        .from('tasks')
        .select('id, title, priority, due_at')
        .eq('status', 'open')
        .lt('due_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
        .order('due_at', { ascending: true })
        .limit(10),
    ]);

    // Pick a "one thing now" — filter by energy + time budget, small-first.
    const candidates = (today ?? []).filter((t) => {
      if (energy && t.energy_level && t.energy_level !== energy) return false;
      if (available && t.estimated_minutes && t.estimated_minutes > available) return false;
      return true;
    });
    candidates.sort((a, b) => {
      const am = a.estimated_minutes ?? 999;
      const bm = b.estimated_minutes ?? 999;
      if (am !== bm) return am - bm; // small-first for momentum
      return (b.priority ?? 1) - (a.priority ?? 1);
    });
    const oneThing = candidates[0] ?? (today ?? [])[0] ?? null;

    return {
      ok: true,
      today_count: today?.length ?? 0,
      overdue_count: overdue?.length ?? 0,
      today,
      overdue,
      one_thing_now: oneThing,
      energy: energy ?? null,
      available_minutes: available ?? null,
    };
  },
};
