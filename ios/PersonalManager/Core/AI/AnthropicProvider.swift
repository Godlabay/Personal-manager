import Foundation

/// Anthropic Messages API implementation. Tool-use protocol differs from OpenAI —
/// tools appear as `tool_use` content blocks and the caller replies with `tool_result` blocks.
public struct AnthropicProvider: LLMProvider {
    public let kind: LLMProviderKind = .anthropic
    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!
    private let version  = "2023-06-01"

    public init() {}

    public func complete(_ request: ChatRequest, apiKey: String) async throws -> ChatResponse {
        // Split out the system prompt.
        let systemText = request.messages.first(where: { $0.role == .system })?.content
        let conversation = request.messages.filter { $0.role != .system }

        var req = URLRequest(url: endpoint)
        req.httpMethod = "POST"
        req.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        req.setValue(version, forHTTPHeaderField: "anthropic-version")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let messages = conversation.map(Self.toAnthropicMessage)
        let tools = request.tools.map(Self.toAnthropicTool)

        let payload: [String: Any] = [
            "model":       request.model,
            "max_tokens":  1500,
            "temperature": request.temperature,
            "system":      systemText ?? "",
            "messages":    messages.map { $0.asDictionary },
            "tools":       tools
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else {
            throw LLMError.http(-1, String(data: data, encoding: .utf8) ?? "")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw LLMError.http(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }

        guard let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw LLMError.decoding("not an object")
        }
        return try parseResponse(obj)
    }

    // MARK: - Parse

    private func parseResponse(_ obj: [String: Any]) throws -> ChatResponse {
        let content = (obj["content"] as? [[String: Any]]) ?? []
        var text = ""
        var toolCalls: [ToolCall] = []
        for block in content {
            switch block["type"] as? String {
            case "text":
                if let t = block["text"] as? String { text += t }
            case "tool_use":
                let id = block["id"] as? String ?? UUID().uuidString
                let name = block["name"] as? String ?? ""
                let input = block["input"] ?? [:]
                let argData = try JSONSerialization.data(withJSONObject: input)
                let argStr = String(data: argData, encoding: .utf8) ?? "{}"
                toolCalls.append(ToolCall(id: id, name: name, arguments: argStr))
            default:
                break
            }
        }
        let stopReason = obj["stop_reason"] as? String
        let usage = obj["usage"] as? [String: Any]
        return ChatResponse(
            message: ChatMessage(
                role: .assistant,
                content: text.isEmpty ? nil : text,
                toolCalls: toolCalls.isEmpty ? nil : toolCalls
            ),
            stopReason: stopReason,
            inputTokens: usage?["input_tokens"] as? Int,
            outputTokens: usage?["output_tokens"] as? Int
        )
    }

    // MARK: - Wire mapping

    private struct AnthropicMessage {
        let role: String
        let content: [[String: Any]]
        var asDictionary: [String: Any] { ["role": role, "content": content] }
    }

    private static func toAnthropicMessage(_ m: ChatMessage) -> AnthropicMessage {
        switch m.role {
        case .user:
            if let id = m.toolCallId {
                // Caller is replying to a tool call.
                let result: [String: Any] = [
                    "type": "tool_result",
                    "tool_use_id": id,
                    "content": m.content ?? ""
                ]
                return AnthropicMessage(role: "user", content: [result])
            }
            return AnthropicMessage(role: "user", content: [["type": "text", "text": m.content ?? ""]])
        case .assistant:
            var blocks: [[String: Any]] = []
            if let text = m.content, !text.isEmpty {
                blocks.append(["type": "text", "text": text])
            }
            if let calls = m.toolCalls {
                for c in calls {
                    var input: Any = [:]
                    if let data = c.arguments.data(using: .utf8),
                       let obj = try? JSONSerialization.jsonObject(with: data) {
                        input = obj
                    }
                    blocks.append([
                        "type": "tool_use",
                        "id": c.id,
                        "name": c.name,
                        "input": input
                    ])
                }
            }
            return AnthropicMessage(role: "assistant", content: blocks)
        case .tool:
            // In canonical form we use `.user` with `toolCallId` to reply with a tool_result.
            let result: [String: Any] = [
                "type": "tool_result",
                "tool_use_id": m.toolCallId ?? "",
                "content": m.content ?? ""
            ]
            return AnthropicMessage(role: "user", content: [result])
        case .system:
            // System is already extracted at the top level.
            return AnthropicMessage(role: "user", content: [])
        }
    }

    private static func toAnthropicTool(_ spec: ToolSpec) -> [String: Any] {
        var schema: Any = [:]
        if let data = spec.parametersJSON.data(using: .utf8),
           let obj = try? JSONSerialization.jsonObject(with: data) {
            schema = obj
        }
        return [
            "name": spec.name,
            "description": spec.description,
            "input_schema": schema
        ]
    }
}
