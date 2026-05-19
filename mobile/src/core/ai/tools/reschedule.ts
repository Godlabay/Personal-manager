import { supabase } from '../../supabase/client';
import type { AgentTool } from './index';

/**
 * reschedule — move a task to a new due date.
 * Distinct from defer_task by intent: reschedule = planning choice; defer = "pas aujourd'hui".
 */
export const rescheduleTool: AgentTool = {
  schema: {
    name: 'reschedule',
    description: 'Change the due date of a task. Pass new_due_at as ISO-8601 in the user timezone, or null to clear.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        new_due_at: { type: ['string', 'null'], description: 'ISO-8601 datetime, or null to remove the due date.' },
        has_time: { type: 'boolean' },
      },
      required: ['task_id'],
    },
  },

  async execute(input) {
    const id = String(input.task_id ?? '');
    if (!id) throw new Error('reschedule: task_id is required');

    const patch: Record<string, unknown> = {
      due_at: input.new_due_at ?? null,
      due_has_time: !!input.has_time,
    };
    const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return { ok: true, task_id: data?.id, due_at: data?.due_at };
  },
};
