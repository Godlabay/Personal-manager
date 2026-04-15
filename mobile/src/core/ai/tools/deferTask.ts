import { supabase } from '../../supabase/client';
import type { AgentTool } from './index';

/**
 * defer_task — ADHD-friendly verb meaning "push this out without guilt".
 * Either days-from-now or a specific ISO date. Kept separate from reschedule
 * so the system prompt can coach the model on tone ("defer" ≠ "procrastinate").
 */
export const deferTaskTool: AgentTool = {
  schema: {
    name: 'defer_task',
    description:
      'Push a task out without judgement. Use when the user says "not today", "plus tard", "pas envie aujourd\'hui". Prefer this over reschedule when the user is expressing low energy.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        days: { type: 'number', description: 'Number of days to push the task forward (e.g. 1 = tomorrow).' },
        until_date: { type: 'string', description: 'ISO-8601 datetime. Takes precedence over days.' },
      },
      required: ['task_id'],
    },
  },

  async execute(input) {
    const id = String(input.task_id ?? '');
    if (!id) throw new Error('defer_task: task_id is required');

    let target: Date;
    if (typeof input.until_date === 'string' && input.until_date) {
      target = new Date(input.until_date);
    } else {
      const days = typeof input.days === 'number' ? input.days : 1;
      // Base on current due_at if present, else today.
      const { data: current } = await supabase
        .from('tasks')
        .select('due_at')
        .eq('id', id)
        .maybeSingle();
      const base = current?.due_at ? new Date(current.due_at as string) : new Date();
      base.setHours(0, 0, 0, 0);
      base.setDate(base.getDate() + days);
      target = base;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ due_at: target.toISOString(), due_has_time: false })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { ok: true, task_id: data?.id, new_due_at: data?.due_at };
  },
};
