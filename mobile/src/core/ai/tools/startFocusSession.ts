import type { AgentTool } from './index';

/**
 * start_focus_session — the tool returns a structured request; the actual side
 * effect (open the Focus sheet, start the timer, play the ambience) is handled
 * by the UI via a side-channel (a zustand store the agent runner publishes to).
 *
 * We keep it pure here: the AgentRunner injects a callback at construction time
 * which this tool invokes. Without a callback the tool is a no-op that still
 * returns the intended parameters — that way tests don't need a UI.
 */

type FocusLaunchRequest = {
  task_id?: string;
  duration_minutes: number;
  ambience?: string;
};

let launchHandler: ((req: FocusLaunchRequest) => Promise<void> | void) | null = null;

export function setFocusLaunchHandler(handler: typeof launchHandler): void {
  launchHandler = handler;
}

export const startFocusSessionTool: AgentTool = {
  schema: {
    name: 'start_focus_session',
    description:
      'Start a Pomodoro-style focus session, optionally tied to a task and with a lo-fi ambience. Use when the user says "let\'s focus", "focus 25 min", "mettons-nous au travail".',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to focus on (optional).' },
        duration_minutes: {
          type: 'number',
          description: 'Focus duration in minutes. Typical: 25, 50, 90.',
        },
        ambience: {
          type: 'string',
          description:
            'Preset id from the AmbiencePicker catalog: rohan_lofi | shire_rainy | rivendell_piano | mordor_dark | fangorn_forest | silence. Omit or "silence" for no audio.',
        },
      },
      required: ['duration_minutes'],
    },
  },

  async execute(input) {
    const req: FocusLaunchRequest = {
      task_id: input.task_id as string | undefined,
      duration_minutes: Number(input.duration_minutes ?? 25),
      ambience: (input.ambience as string | undefined) ?? 'silence',
    };
    if (launchHandler) {
      try {
        await launchHandler(req);
      } catch (e) {
        return { ok: false, error: String(e), request: req };
      }
    }
    return { ok: true, launched: !!launchHandler, ...req };
  },
};
