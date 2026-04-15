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
 * OpenAI Chat Completions implementation using function-calling (the `tools`
 * parameter). Default model is `gpt-4o-mini` to keep BYOK cost low; can be
 * overridden per request via AgentRunner's model option.
 *
 * We send a single HTTP request per turn (no streaming for Phase 1 — we'll add
 * SSE in Phase 2). The response is normalised to our provider-agnostic shape.
 */

const DEFAULT_MODEL = 'gpt-4o-mini';
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

function toOpenAIMessages(system: string, msgs: ChatMessage[]): unknown[] {
  const out: unknown[] = [{ role: 'system', content: system }];
  for (const m of msgs) {
    if (m.role === 'tool') {
      // A `tool` message is the reply to a tool_use; OpenAI expects one
      // message per tool_call with tool_call_id.
      for (const part of m.content) {
        if (part.type !== 'tool_result') continue;
        out.push({
          role: 'tool',
          tool_call_id: part.tool_use_id,
          content: part.content,
        });
      }
      continue;
    }
    if (m.role === 'assistant') {
      // Assistant turn may contain text + tool_use parts.
      const text = m.content.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');
      const toolCalls = m.content
        .filter((p) => p.type === 'tool_use')
        .map((p) => {
          const tu = p as { id: string; name: string; input: unknown };
          return {
            id: tu.id,
            type: 'function',
            function: { name: tu.name, arguments: JSON.stringify(tu.input ?? {}) },
          };
        });
      const entry: Record<string, unknown> = { role: 'assistant' };
      if (text) entry.content = text;
      if (toolCalls.length) entry.tool_calls = toolCalls;
      out.push(entry);
      continue;
    }
    // user
    const text = m.content.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');
    out.push({ role: 'user', content: text });
  }
  return out;
}

function toOpenAITools(tools?: ToolSchema[]): unknown[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

function mapFinishReason(reason: string | undefined): StopReason {
  if (reason === 'tool_calls') return 'tool_use';
  if (reason === 'length') return 'max_tokens';
  if (reason === 'stop' || reason === 'end_turn') return 'end_turn';
  return 'end_turn';
}

export function createOpenAIProvider(apiKey: string, model = DEFAULT_MODEL): LLMProvider {
  return {
    id: 'openai',

    async ping() {
      try {
        const r = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (r.ok) return { ok: true } as const;
        const body = await r.text();
        return { ok: false as const, error: `${r.status} ${body.slice(0, 200)}` };
      } catch (e) {
        return { ok: false as const, error: String(e) };
      }
    },

    async chat(req: ChatRequest): Promise<ChatResponse> {
      const body: Record<string, unknown> = {
        model,
        messages: toOpenAIMessages(req.system, req.messages),
        temperature: req.temperature ?? 0.4,
        max_tokens: req.maxTokens ?? 1024,
      };
      const tools = toOpenAITools(req.tools);
      if (tools) body.tools = tools;
      if (req.cacheKey) body.prompt_cache_key = req.cacheKey;

      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`OpenAI ${r.status}: ${txt.slice(0, 400)}`);
      }
      const json = (await r.json()) as {
        choices: Array<{
          message: {
            content: string | null;
            tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
          };
          finish_reason: string;
        }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      const choice = json.choices[0];
      const parts: ContentPart[] = [];
      if (choice.message.content) parts.push({ type: 'text', text: choice.message.content });
      for (const tc of choice.message.tool_calls ?? []) {
        let input: Record<string, unknown> = {};
        try { input = JSON.parse(tc.function.arguments || '{}'); } catch { /* keep empty */ }
        parts.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input });
      }
      return {
        content: parts,
        stopReason: mapFinishReason(choice.finish_reason),
        usage: json.usage
          ? { inputTokens: json.usage.prompt_tokens, outputTokens: json.usage.completion_tokens }
          : undefined,
      };
    },
  };
}
