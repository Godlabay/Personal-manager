import { scheduleTaskReminder } from '../../notifications/notifications';
import { supabase } from '../../supabase/client';
import type { AgentTool } from './index';

/**
 * set_reminder — schedule a gentle local nudge for a task.
 *
 * Why a tool: the agent can react to phrases like "rappelle-moi demain à 17h"
 * or "nudge me in 2h" without the user opening a picker. The notification is
 * scheduled on-device via expo-notifications.
 */
export const setReminderTool: AgentTool = {
  schema: {
    name: 'set_reminder',
    description: 'Schedule a local reminder for a task at a specific time. Pass fire_at as an ISO-8601 datetime in the user\'s timezone.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        fire_at: { type: 'string', description: 'ISO-8601 datetime when the reminder should fire.' },
      },
      required: ['task_id', 'fire_at'],
    },
  },

  async execute(input) {
    const taskId = String(input.task_id ?? '');
    const fireAt = new Date(String(input.fire_at ?? ''));
    if (!taskId || Number.isNaN(fireAt.getTime())) {
      throw new Error('set_reminder: task_id and a valid fire_at are required');
    }

    // Look up the task title so we can show it in the banner.
    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .maybeSingle();
    const title = (task as { title?: string } | null)?.title ?? 'Tâche';

    const reminderId = await scheduleTaskReminder(taskId, title, fireAt);
    if (!reminderId) {
      return { ok: false, reason: 'Permission refusée ou date dépassée.' };
    }
    return { ok: true, reminder_id: reminderId, fire_at: fireAt.toISOString() };
  },
};
