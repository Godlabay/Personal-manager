import Foundation

/// OpenAI Chat Completions implementation.
/// Uses the classic `/v1/chat/completions` endpoint with function-calling.
public struct OpenAIProvider: LLMProvider {
    public let kind: LLMProviderKind = .openai
    private let endpoint = URL(string: "https://api.openai.com/v1/chat/completions")!

    public init() {}

    public func complete(_ request: ChatRequest, apiKey: String) async throws -> ChatResponse {
        var req = URLRequest(url: endpoint)
        req.httpMethod = "POST"
        req.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload = OAIRequest(
            model: request.model,
            messages: request.messages.map(Self.toOAIMessage),
            tools: request.tools.map(Self.toOAITool),
            temperature: request.temperature
        )

        let enc = JSONEncoder()
        enc.keyEncodingStrategy = .convertToSnakeCase
        enc.outputFormatting = [.withoutEscapingSlashes]
        req.httpBody = try enc.encode(payload)

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else {
            throw LLMError.http(-1, String(data: data, encoding: .utf8) ?? "")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw LLMError.http(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }

        let dec = JSONDecoder()
        dec.keyDecodingStrategy = .convertFromSnakeCase
        let parsed = try dec.decode(OAIResponse.self, from: data)
        guard let first = parsed.choices.first else {
            throw LLMError.decoding("empty choices")
        }
        return ChatResponse(
            message: Self.fromOAIMessage(first.message),
            stopReason: first.finishReason,
            inputTokens: parsed.usage?.promptTokens,
            outputTokens: parsed.usage?.completionTokens
        )
    }

    // MARK: - Wire types

    private struct OAIRequest: Encodable {
        let model: String
        let messages: [OAIMessage]
        let tools: [OAITool]
        let temperature: Double
    }

    private struct OAIMessage: Codable {
        let role: String
        let content: String?
        let toolCalls: [OAIToolCall]?
        let toolCallId: String?
    }

    private struct OAIToolCall: Codable {
        let id: String
        let type: String
        let function: OAIFunction
    }

    private struct OAIFunction: Codable {
        let name: String
        let arguments: String
    }

    private struct OAITool: Encodable {
        let type: String = "function"
        let function: OAIToolDef
    }

    private struct OAIToolDef: Encodable {
        let name: String
        let description: String
        let parameters: RawJSON

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(name, forKey: .name)
            try c.encode(description, forKey: .description)
            try c.encode(parameters, forKey: .parameters)
        }
        enum CodingKeys: String, CodingKey { case name, description, parameters }
    }

    private struct OAIResponse: Decodable {
        let choices: [OAIChoice]
        let usage: OAIUsage?
    }
    private struct OAIChoice: Decodable {
        let message: OAIMessage
        let finishReason: String?
    }
    private struct OAIUsage: Decodable {
        let promptTokens: Int?
        let completionTokens: Int?
    }

    // MARK: - Mapping

    private static func toOAIMessage(_ m: ChatMessage) -> OAIMessage {
        OAIMessage(
            role: m.role.rawValue,
            content: m.content,
            toolCalls: m.toolCalls?.map {
                OAIToolCall(id: $0.id, type: "function", function: OAIFunction(name: $0.name, arguments: $0.arguments))
            },
            toolCallId: m.toolCallId
        )
    }

    private static func fromOAIMessage(_ m: OAIMessage) -> ChatMessage {
        ChatMessage(
            role: ChatRole(rawValue: m.role) ?? .assistant,
            content: m.content,
            toolCalls: m.toolCalls?.map {
                ToolCall(id: $0.id, name: $0.function.name, arguments: $0.function.arguments)
            },
            toolCallId: m.toolCallId
        )
    }

    private static func toOAITool(_ spec: ToolSpec) -> OAITool {
        OAITool(function: OAIToolDef(
            name: spec.name,
            description: spec.description,
            parameters: RawJSON(jsonString: spec.parametersJSON)
        ))
    }
}

/// Holds a JSON Schema string verbatim so we don't re-encode it.
struct RawJSON: Encodable {
    let jsonString: String
    func encode(to encoder: Encoder) throws {
        // Parse then re-encode to ensure the receiver sees a real JSON object, not a string.
        guard let data = jsonString.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) else {
            var c = encoder.singleValueContainer()
            try c.encode([String: String]())  // empty object fallback
            return
        }
        // Use JSONSerialization output via a temporary container
        // (Encodable path can't re-emit arbitrary JSON; we wrap it.)
        let repacked = try JSONSerialization.data(withJSONObject: obj)
        // Decode into AnyCodable-ish structure:
        let decoded = try JSONDecoder().decode(AnyJSONValue.self, from: repacked)
        try decoded.encode(to: encoder)
    }
}

/// Lightweight JSON value used only to re-emit a parsed JSON tree.
enum AnyJSONValue: Encodable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([AnyJSONValue])
    case object([String: AnyJSONValue])

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null; return }
        if let b = try? c.decode(Bool.self) { self = .bool(b); return }
        if let n = try? c.decode(Double.self) { self = .number(n); return }
        if let s = try? c.decode(String.self) { self = .string(s); return }
        if let a = try? c.decode([AnyJSONValue].self) { self = .array(a); return }
        if let o = try? c.decode([String: AnyJSONValue].self) { self = .object(o); return }
        self = .null
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let b): try c.encode(b)
        case .number(let n): try c.encode(n)
        case .string(let s): try c.encode(s)
        case .array(let a): try c.encode(a)
        case .object(let o): try c.encode(o)
        }
    }
}

extension AnyJSONValue: Decodable {}
