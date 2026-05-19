import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ContentPart,
  LLMProvider,
  StopReason,
  ToolSchema,
} from './provider';

/**
 * Anthropic Messages API implementation.
 * Default model is `claude-3-5-haiku-latest` for cost; `break_down_task` and
 * `daily_brief` can opt into `claude-sonnet-4-5` via AgentRunner's model override.
 *
 * Uses cache_control on the system prompt when caller supplies a cacheKey.
 */

const DEFAULT_MODEL = 'claude-3-5-haiku-latest';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const VERSION = '2023-06-01';

function toAnthropicMessages(msgs: ChatMessage[]): unknown[] {
  const out: unknown[] = [];
  for (const m of msgs) {
    if (m.role === 'tool') {
      // Anthropic represents tool_result as a user message containing tool_result blocks.
      const blocks = m.content
        .filter((p) => p.type === 'tool_result')
        .map((p) => {
          const tr = p as { tool_use_id: string; content: string; isError?: boolean };
          return {
            type: 'tool_result',
            tool_use_id: tr.tool_use_id,
            content: tr.content,
            is_error: !!tr.isError,
          };
        });
      out.push({ role: 'user', content: blocks });
      continue;
    }
    if (m.role === 'assistant') {
      const blocks = m.content.map((p) => {
        if (p.type === 'text') return { type: 'text', text: p.text };
        if (p.type === 'tool_use') return { type: 'tool_use', id: p.id, name: p.name, input: p.input };
        return null;
      }).filter(Boolean);
      out.push({ role: 'assistant', content: blocks });
      continue;
    }
    const blocks = m.content
      .filter((p) => p.type === 'text')
      .map((p) => ({ type: 'text', text: (p as { text: string }).text }));
    out.push({ role: 'user', content: blocks });
  }
  return out;
}

function toAnthropicTools(tools?: ToolSchema[]): unknown[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

function mapStopReason(reason: string | undefined): StopReason {
  if (reason === 'tool_use') return 'tool_use';
  if (reason === 'max_tokens') return 'max_tokens';
  return 'end_turn';
}

export function createAnthropicProvider(apiKey: string, model = DEFAULT_MODEL): LLMProvider {
  return {
    id: 'anthropic',

    async ping() {
      try {
        // Anthropic doesn't have a cheap "list models" endpoint; we do a 1-token request instead.
        const r = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (r.ok) return { ok: true } as const;
        const txt = await r.text();
        return { ok: false as const, error: `${r.status} ${txt.slice(0, 200)}` };
      } catch (e) {
        return { ok: false as const, error: String(e) };
      }
    },

    async chat(req: ChatRequest): Promise<ChatResponse> {
      const systemBlocks: unknown[] = [
        req.cacheKey
          ? { type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }
          : { type: 'text', text: req.system },
      ];
      const body: Record<string, unknown> = {
        model,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.4,
        system: systemBlocks,
        messages: toAnthropicMessages(req.messages),
      };
      const tools = toAnthropicTools(req.tools);
      if (tools) body.tools = tools;

      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Anthropic ${r.status}: ${txt.slice(0, 400)}`);
      }
      const json = (await r.json()) as {
        content: Array<
          | { type: 'text'; text: string }
          | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
        >;
        stop_reason?: string;
        usage?: { input_tokens: number; output_tokens: number };
      };
      const parts: ContentPart[] = json.content.map((b) => {
        if (b.type === 'text') return { type: 'text', text: b.text };
        return { type: 'tool_use', id: b.id, name: b.name, input: b.input };
      });
      return {
        content: parts,
        stopReason: mapStopReason(json.stop_reason),
        usage: json.usage
          ? { inputTokens: json.usage.input_tokens, outputTokens: json.usage.output_tokens }
          : undefined,
      };
    },
  };
}
