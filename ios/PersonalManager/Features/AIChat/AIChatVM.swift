import Foundation
import SwiftUI

/// Wraps `AgentRunner` for the chat UI. Keeps the message list, handles input,
/// and dispatches tool execution.
@MainActor
public final class AIChatVM: ObservableObject {
    @Published public var messages: [ChatMessage] = []
    @Published public var input: String = ""
    @Published public var isThinking: Bool = false
    @Published public var lastError: String?

    /// Sent to the UI so the app can react to `start_focus_session` tool calls.
    @Published public var pendingFocus: FocusStartRequest?

    private let runner = AgentRunner(tools: AgentRunner.defaultTools)
    private let systemPrompt: String
    private let registry = ProviderRegistry.shared

    public init(systemPrompt: String) {
        self.systemPrompt = systemPrompt
    }

    public func reset() {
        messages.removeAll()
        lastError = nil
    }

    public func send(userId: UUID, locale: String) async {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isThinking else { return }
        guard let key = registry.apiKey(), !key.isEmpty else {
            lastError = "No API key configured for \(registry.selectedKind.displayName)."
            return
        }

        input = ""
        messages.append(ChatMessage(role: .user, content: text))
        isThinking = true
        defer { isThinking = false }

        let context = AgentContext(
            userId: userId,
            locale: locale,
            onFocusStart: { [weak self] req in
                await MainActor.run { self?.pendingFocus = req }
            }
        )

        do {
            _ = try await runner.run(
                messages: &messages,
                provider: registry.provider(),
                apiKey: key,
                model: registry.selectedModel,
                systemPrompt: systemPrompt,
                context: context
            )
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }
}
