import { supabase } from '../../supabase/client';
import type { AgentTool } from './index';

/**
 * break_down_task — the LLM proposes subtask titles for an existing task.
 * We insert them as children (parent_task_id set) and return the created rows.
 *
 * Note: the actual *generation* of subtask titles happens upstream in the LLM
 * call (it's what the LLM does before calling this tool). We just persist.
 */
export const breakDownTaskTool: AgentTool = {
  schema: {
    name: 'break_down_task',
    description:
      'Split an existing task into smaller subtasks. Call this after you have decided on the list of subtitles.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the parent task.' },
        subtasks: {
          type: 'array',
          description: 'Ordered list of short subtask titles (max 7).',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              estimated_minutes: { type: 'number' },
              energy_level: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['title'],
          },
        },
      },
      required: ['task_id', 'subtasks'],
    },
  },

  async execute(input) {
    const task_id = String(input.task_id ?? '');
    const subtasks = (input.subtasks as Array<Record<string, unknown>>) ?? [];
    if (!task_id) throw new Error('break_down_task: task_id is required');
    if (!subtasks.length) throw new Error('break_down_task: subtasks array is empty');

    // Fetch parent to inherit project_id & user (RLS will enforce ownership).
    const { data: parent, error: parentErr } = await supabase
      .from('tasks')
      .select('id, project_id, section_id, priority')
      .eq('id', task_id)
      .single();
    if (parentErr || !parent) throw parentErr ?? new Error('Parent task not found');

    const rows = subtasks.slice(0, 7).map((s, i) => ({
      title: String(s.title),
      parent_task_id: task_id,
      project_id: parent.project_id ?? null,
      section_id: parent.section_id ?? null,
      priority: parent.priority,
      estimated_minutes: s.estimated_minutes ?? null,
      energy_level: s.energy_level ?? null,
      sort_order: i,
    }));

    const { data, error } = await supabase.from('tasks').insert(rows).select('id, title');
    if (error) throw error;
    return { ok: true, created: data?.length ?? 0, subtasks: data };
  },
};
