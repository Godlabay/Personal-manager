import Foundation

/// Starts a focus session via the UI context's `onFocusStart` callback.
public struct StartFocusSessionTool: AgentTool {
    public init() {}

    public let spec = ToolSpec(
        name: "start_focus_session",
        description: "Kick off a Pomodoro focus session with a lo-fi ambience. Use when the user says 'I'll focus on X' or asks for help sitting down to work.",
        parametersJSON: """
        {
          "type": "object",
          "properties": {
            "task_id":          { "type": "string", "description": "Optional UUID of the task to focus on." },
            "duration_minutes": { "type": "integer", "minimum": 5, "maximum": 180, "default": 25 },
            "ambience":         {
              "type": "string",
              "description": "Preset id. One of: rohan-lofi, shire-rain, rivendell-piano, fangorn-forest, mordor-dark, silence.",
              "enum": ["rohan-lofi", "shire-rain", "rivendell-piano", "fangorn-forest", "mordor-dark", "silence"]
            }
          }
        }
        """
    )

    private struct Args: Decodable {
        let task_id: String?
        let duration_minutes: Int?
        let ambience: String?
    }

    public func execute(argumentsJSON: String, context: AgentContext) async throws -> String {
        let args = (try? decodeArgs(Args.self, json: argumentsJSON)) ?? Args(task_id: nil, duration_minutes: nil, ambience: nil)

        let req = FocusStartRequest(
            taskId: args.task_id.flatMap(UUID.init(uuidString:)),
            durationMinutes: args.duration_minutes ?? 25,
            ambienceId: args.ambience
        )
        await context.onFocusStart(req)
        let amb = args.ambience ?? "silence"
        return "✓ Focus session launched (\(req.durationMinutes) min, ambience '\(amb)')."
    }
}
