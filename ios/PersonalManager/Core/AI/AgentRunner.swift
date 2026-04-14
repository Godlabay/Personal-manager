import Foundation

/// Orchestrates a bounded tool-use loop on-device.
/// The `LLMProvider` never sees Supabase JWTs; tools run locally against Postgrest.
@MainActor
public final class AgentRunner: ObservableObject {
    public static let maxIterations = 8

    private let tools: [AgentTool]
    private let toolIndex: [String: AgentTool]

    public init(tools: [AgentTool]) {
        self.tools = tools
        self.toolIndex = Dictionary(uniqueKeysWithValues: tools.map { ($0.spec.name, $0) })
    }

    public static let defaultTools: [AgentTool] = [
        CreateTaskTool(),
        BreakDownTaskTool(),
        RescheduleTool(),
        DeferTaskTool(),
        DailyBriefTool(),
        StartFocusSessionTool()
    ]

    /// Runs the agent. Appends messages to `messages` in place (including tool calls and results)
    /// and returns the final assistant message text.
    public func run(
        messages: inout [ChatMessage],
        provider: LLMProvider,
        apiKey: String,
        model: String,
        systemPrompt: String,
        context: AgentContext,
        onEvent: ((AgentEvent) -> Void)? = nil
    ) async throws -> String {
        // Ensure the system message is first.
        if messages.first?.role != .system {
            messages.insert(ChatMessage(role: .system, content: systemPrompt), at: 0)
        } else {
            messages[0].content = systemPrompt
        }

        let toolSpecs = tools.map { $0.spec }

        for iter in 0..<Self.maxIterations {
            onEvent?(.iteration(iter + 1))

            let req = ChatRequest(model: model, messages: messages, tools: toolSpecs)
            let resp = try await provider.complete(req, apiKey: apiKey)

            // Always append the assistant message to preserve tool call IDs for the next round.
            messages.append(resp.message)
            onEvent?(.assistantMessage(resp.message))

            // If there are no tool calls, we're done.
            guard let calls = resp.message.toolCalls, !calls.isEmpty else {
                return resp.message.content ?? ""
            }

            // Execute every tool call, appending a tool-result message for each.
            for call in calls {
                onEvent?(.toolCall(call))
                let result: String
                if let tool = toolIndex[call.name] {
                    do {
                        result = try await tool.execute(argumentsJSON: call.arguments, context: context)
                    } catch {
                        result = "ERROR: \(error.localizedDescription)"
                    }
                } else {
                    result = "ERROR: unknown tool '\(call.name)'."
                }
                let toolMessage = ChatMessage(
                    role: .tool,
                    content: result,
                    toolCallId: call.id
                )
                messages.append(toolMessage)
                onEvent?(.toolResult(call.id, result))
            }
        }

        return "Reached maximum iterations. Try asking again with a smaller scope."
    }
}

public enum AgentEvent {
    case iteration(Int)
    case assistantMessage(ChatMessage)
    case toolCall(ToolCall)
    case toolResult(String, String)
}
