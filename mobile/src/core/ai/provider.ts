/**
 * Provider-agnostic interface for chat-with-tools LLMs.
 * Both OpenAI and Anthropic implementations normalise their wire formats into
 * this shape so AgentRunner doesn't care which one we're calling.
 */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface TextPart { type: 'text'; text: string }

export interface ToolUsePart {
  type: 'tool_use';
  /** Provider-specific id — we echo it back when we send a tool_result. */
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultPart {
  type: 'tool_result';
  tool_use_id: string;
  /** JSON-serialisable result. */
  content: string;
  isError?: boolean;
}

export type ContentPart = TextPart | ToolUsePart | ToolResultPart;

export interface ChatMessage {
  role: ChatRole;
  content: ContentPart[];
}

export interface ToolSchema {
  name: string;
  description: string;
  /** JSON Schema for the tool input object. */
  parameters: Record<string, unknown>;
}

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'error';

export interface ChatResponse {
  content: ContentPart[];
  stopReason: StopReason;
  /** For cost display in Settings. */
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
  tools?: ToolSchema[];
  /** Cache hint for providers that support it (OpenAI prompt_cache_key, Anthropic cache_control). */
  cacheKey?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  id: string;
  /** Cheap network probe to validate the API key. */
  ping(): Promise<{ ok: true } | { ok: false; error: string }>;
  chat(req: ChatRequest): Promise<ChatResponse>;
}

/** Convenience constructors for message content. */
export function text(t: string): TextPart {
  return { type: 'text', text: t };
}

export function toolResult(id: string, result: unknown, isError = false): ToolResultPart {
  return {
    type: 'tool_result',
    tool_use_id: id,
    content: typeof result === 'string' ? result : JSON.stringify(result),
    isError,
  };
}
