import Foundation

/// A tool the agent can call. Tools execute on-device via Supabase repos.
/// Each tool is responsible for parsing its own JSON arguments and returning a
/// short, human-readable (and model-readable) summary string.
public protocol AgentTool: Sendable {
    var spec: ToolSpec { get }
    func execute(argumentsJSON: String, context: AgentContext) async throws -> String
}

/// Shared context passed to every tool.
public struct AgentContext: Sendable {
    public let userId: UUID
    public let locale: String              // "fr" or "en"
    public let onFocusStart: @Sendable (FocusStartRequest) async -> Void

    public init(
        userId: UUID,
        locale: String,
        onFocusStart: @escaping @Sendable (FocusStartRequest) async -> Void
    ) {
        self.userId = userId
        self.locale = locale
        self.onFocusStart = onFocusStart
    }
}

public struct FocusStartRequest: Sendable {
    public let taskId: UUID?
    public let durationMinutes: Int
    public let ambienceId: String?
}
