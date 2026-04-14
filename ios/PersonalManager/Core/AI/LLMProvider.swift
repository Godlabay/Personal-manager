import Foundation

public enum LLMProviderKind: String, CaseIterable, Identifiable, Codable, Sendable {
    case openai
    case anthropic
    case gemini
    case groq

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .openai:    return "OpenAI"
        case .anthropic: return "Anthropic (Claude)"
        case .gemini:    return "Google Gemini"
        case .groq:      return "Groq"
        }
    }

    /// Where to go to create a key. Shown in the onboarding sheet.
    public var getKeyURL: URL {
        switch self {
        case .openai:    return URL(string: "https://platform.openai.com/api-keys")!
        case .anthropic: return URL(string: "https://console.anthropic.com/settings/keys")!
        case .gemini:    return URL(string: "https://aistudio.google.com/app/apikey")!
        case .groq:      return URL(string: "https://console.groq.com/keys")!
        }
    }

    public var defaultModel: String {
        switch self {
        case .openai:    return "gpt-4o-mini"
        case .anthropic: return "claude-sonnet-4-6"
        case .gemini:    return "gemini-2.5-flash"
        case .groq:      return "llama-3.3-70b-versatile"
        }
    }
}

// MARK: - Canonical chat types

public enum ChatRole: String, Codable, Sendable {
    case system, user, assistant, tool
}

public struct ChatMessage: Codable, Sendable {
    public var role: ChatRole
    public var content: String?
    public var toolCalls: [ToolCall]?
    public var toolCallId: String?

    public init(role: ChatRole, content: String? = nil, toolCalls: [ToolCall]? = nil, toolCallId: String? = nil) {
        self.role = role
        self.content = content
        self.toolCalls = toolCalls
        self.toolCallId = toolCallId
    }
}

public struct ToolCall: Codable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var arguments: String   // JSON-encoded string, per provider convention

    public init(id: String, name: String, arguments: String) {
        self.id = id
        self.name = name
        self.arguments = arguments
    }
}

public struct ToolSpec: Codable, Sendable {
    public var name: String
    public var description: String
    public var parametersJSON: String   // raw JSON-Schema blob

    public init(name: String, description: String, parametersJSON: String) {
        self.name = name
        self.description = description
        self.parametersJSON = parametersJSON
    }
}

public struct ChatRequest: Sendable {
    public var model: String
    public var messages: [ChatMessage]
    public var tools: [ToolSpec]
    public var temperature: Double

    public init(model: String, messages: [ChatMessage], tools: [ToolSpec], temperature: Double = 0.3) {
        self.model = model
        self.messages = messages
        self.tools = tools
        self.temperature = temperature
    }
}

public struct ChatResponse: Sendable {
    public var message: ChatMessage
    public var stopReason: String?       // provider-specific label
    public var inputTokens: Int?
    public var outputTokens: Int?
}

// MARK: - Provider protocol

public protocol LLMProvider: Sendable {
    var kind: LLMProviderKind { get }

    /// One-shot, non-streaming completion returning the full assistant message.
    /// Streaming is a Phase 1.5 improvement; the agent works fine one-shot.
    func complete(_ request: ChatRequest, apiKey: String) async throws -> ChatResponse
}

public enum LLMError: LocalizedError {
    case missingKey(LLMProviderKind)
    case http(Int, String)
    case decoding(String)

    public var errorDescription: String? {
        switch self {
        case .missingKey(let p):
            return "No API key set for \(p.displayName). Add one in Settings → AI."
        case .http(let code, let body):
            return "Provider returned HTTP \(code): \(body.prefix(200))"
        case .decoding(let msg):
            return "Could not decode provider response: \(msg)"
        }
    }
}
