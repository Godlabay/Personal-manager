import { supabase } from '../../supabase/client';
import type { AgentTool } from './index';

/**
 * create_task — most-used tool. The LLM receives the raw user utterance and
 * decides the structured fields; we validate minimally and insert via Supabase.
 */
export const createTaskTool: AgentTool = {
  schema: {
    name: 'create_task',
    description:
      'Create a new task. Use when the user wants to add something to their list. If no project is specified, the task goes to the Inbox (project_id=null).',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short task title as it should appear in the list.' },
        description: { type: 'string', description: 'Optional longer notes.' },
        project_name: {
          type: 'string',
          description: 'If the user mentioned a project by name, resolve it here. Otherwise omit for Inbox.',
        },
        due_at: {
          type: 'string',
          description: 'ISO-8601 datetime in the user timezone. Omit if no due date.',
        },
        due_has_time: {
          type: 'boolean',
          description: 'True if the due date includes a specific time (e.g. 9am), false if it is all-day.',
        },
        priority: { type: 'number', description: '1 (low) to 4 (urgent). Default 1.' },
        labels: { type: 'array', items: { type: 'string' } },
        parent_task_id: { type: 'string', description: 'If this is a subtask, the parent task UUID.' },
        estimated_minutes: { type: 'number' },
        energy_level: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['title'],
    },
  },

  async execute(input) {
    const title = String(input.title ?? '').trim();
    if (!title) throw new Error('create_task: title is required');

    let project_id: string | null = null;
    const projectName = input.project_name as string | undefined;
    if (projectName) {
      const { data } = await supabase
        .from('projects')
        .select('id')
        .ilike('name', projectName)
        .maybeSingle();
      if (data?.id) project_id = data.id as string;
    }

    const payload: Record<string, unknown> = {
      title,
      project_id,
      description: input.description ?? null,
      due_at: input.due_at ?? null,
      due_has_time: !!input.due_has_time,
      priority: clampPriority(input.priority),
      parent_task_id: input.parent_task_id ?? null,
      estimated_minutes: input.estimated_minutes ?? null,
      energy_level: input.energy_level ?? null,
    };
    const { data, error } = await supabase.from('tasks').insert(payload).select().single();
    if (error) throw error;

    // Attach labels (best-effort; failures don't kill the whole tool call).
    const labels = (input.labels as string[] | undefined) ?? [];
    if (labels.length && data?.id) {
      for (const name of labels) {
        const { data: label } = await supabase
          .from('labels')
          .upsert({ name }, { onConflict: 'user_id,name' })
          .select('id')
          .single();
        if (label?.id) {
          await supabase.from('task_labels').insert({ task_id: data.id, label_id: label.id });
        }
      }
    }

    return { ok: true, task_id: data?.id, title: data?.title };
  },
};

function clampPriority(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? 1), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(4, Math.max(1, Math.round(n)));
}
