import type { ToolSchema } from '../provider';

/**
 * An AgentTool is the pairing of:
 *  - A provider-agnostic JSON Schema (what the LLM sees)
 *  - An execute() function that runs on-device with the user's Supabase JWT.
 *
 * The AgentRunner loops: receive tool_use from LLM → find tool by name →
 * execute(input) → feed result back as tool_result → ask LLM for next step.
 */
export interface AgentTool {
  schema: ToolSchema;
  execute(input: Record<string, unknown>): Promise<unknown>;
}

export { createTaskTool } from './createTask';
export { breakDownTaskTool } from './breakDownTask';
export { rescheduleTool } from './reschedule';
export { deferTaskTool } from './deferTask';
export { dailyBriefTool } from './dailyBrief';
export { startFocusSessionTool } from './startFocusSession';

import { createTaskTool } from './createTask';
import { breakDownTaskTool } from './breakDownTask';
import { rescheduleTool } from './reschedule';
import { deferTaskTool } from './deferTask';
import { dailyBriefTool } from './dailyBrief';
import { startFocusSessionTool } from './startFocusSession';

export const ALL_TOOLS: AgentTool[] = [
  createTaskTool,
  breakDownTaskTool,
  rescheduleTool,
  deferTaskTool,
  dailyBriefTool,
  startFocusSessionTool,
];

export function findTool(name: string): AgentTool | undefined {
  return ALL_TOOLS.find((t) => t.schema.name === name);
}
