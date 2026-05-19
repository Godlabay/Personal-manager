import type { ChatMessage, ContentPart, LLMProvider } from './provider';
import { text, toolResult } from './provider';
import { ALL_TOOLS, findTool } from './tools';

/**
 * AgentRunner — drives a provider-agnostic tool-use loop on device.
 *
 * Contract:
 *  - run(userText) appends a user message, asks the LLM, and if the LLM
 *    requests tool_use, executes each tool and feeds the result back.
 *  - The loop is capped at MAX_ITERATIONS to prevent runaway bills.
 *  - Progress is reported via `onEvent` so the UI can show "thinking",
 *    "calling tool X", partial text, etc.
 */

export type AgentEvent =
  | { type: 'assistant_text'; text: string }
  | { type: 'tool_call'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: unknown; isError: boolean }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'done'; reason: string }
  | { type: 'error'; message: string };

const MAX_ITERATIONS = 8;

export interface AgentRunnerOptions {
  provider: LLMProvider;
  systemPrompt: string;
  /** Optional stable cache key for providers that honour prompt caching. */
  cacheKey?: string;
  /** Seed history (e.g. prior turns loaded from ai_messages table). */
  history?: ChatMessage[];
  onEvent?: (e: AgentEvent) => void;
}

export class AgentRunner {
  private provider: LLMProvider;
  private systemPrompt: string;
  private cacheKey: string | undefined;
  private history: ChatMessage[];
  private onEvent: (e: AgentEvent) => void;

  constructor(opts: AgentRunnerOptions) {
    this.provider = opts.provider;
    this.systemPrompt = opts.systemPrompt;
    this.cacheKey = opts.cacheKey;
    this.history = opts.history ?? [];
    this.onEvent = opts.onEvent ?? (() => {});
  }

  get messages(): ChatMessage[] {
    return this.history;
  }

  async run(userText: string): Promise<string> {
    this.history.push({ role: 'user', content: [text(userText)] });

    let finalAnswer = '';
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      let resp;
      try {
        resp = await this.provider.chat({
          system: this.systemPrompt,
          messages: this.history,
          tools: ALL_TOOLS.map((t) => t.schema),
          cacheKey: this.cacheKey,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.onEvent({ type: 'error', message: msg });
        throw e;
      }

      if (resp.usage) {
        this.onEvent({
          type: 'usage',
          inputTokens: resp.usage.inputTokens,
          outputTokens: resp.usage.outputTokens,
        });
      }

      this.history.push({ role: 'assistant', content: resp.content });

      const textParts = resp.content.filter((p) => p.type === 'text') as { type: 'text'; text: string }[];
      for (const tp of textParts) {
        if (tp.text) this.onEvent({ type: 'assistant_text', text: tp.text });
      }
      if (textParts.length) {
        finalAnswer = textParts.map((p) => p.text).join('\n').trim();
      }

      const toolCalls = resp.content.filter((p) => p.type === 'tool_use') as Array<
        { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
      >;

      if (resp.stopReason !== 'tool_use' || toolCalls.length === 0) {
        this.onEvent({ type: 'done', reason: resp.stopReason });
        return finalAnswer;
      }

      // Execute all tool calls in parallel and append their results as a single tool turn.
      const resultParts: ContentPart[] = await Promise.all(
        toolCalls.map(async (tc) => {
          this.onEvent({ type: 'tool_call', name: tc.name, input: tc.input });
          const tool = findTool(tc.name);
          if (!tool) {
            const err = `Unknown tool: ${tc.name}`;
            this.onEvent({ type: 'tool_result', name: tc.name, result: err, isError: true });
            return toolResult(tc.id, { error: err }, true);
          }
          try {
            const result = await tool.execute(tc.input ?? {});
            this.onEvent({ type: 'tool_result', name: tc.name, result, isError: false });
            return toolResult(tc.id, result, false);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.onEvent({ type: 'tool_result', name: tc.name, result: msg, isError: true });
            return toolResult(tc.id, { error: msg }, true);
          }
        }),
      );
      this.history.push({ role: 'tool', content: resultParts });
    }

    this.onEvent({ type: 'done', reason: 'max_iterations' });
    return finalAnswer;
  }
}
