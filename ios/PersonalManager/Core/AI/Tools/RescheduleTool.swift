import Foundation
import Supabase

public struct RescheduleTool: AgentTool {
    public init() {}

    public let spec = ToolSpec(
        name: "reschedule",
        description: "Move a task's due date. Pass an ISO-8601 timestamp for new_due.",
        parametersJSON: """
        {
          "type": "object",
          "properties": {
            "task_id": { "type": "string" },
            "new_due": { "type": "string", "description": "ISO-8601 timestamp." },
            "has_time": { "type": "boolean" }
          },
          "required": ["task_id", "new_due"]
        }
        """
    )

    private struct Args: Decodable {
        let task_id: String
        let new_due: Date
        let has_time: Bool?
    }

    public func execute(argumentsJSON: String, context: AgentContext) async throws -> String {
        let args = try decodeArgs(Args.self, json: argumentsJSON)
        guard let id = UUID(uuidString: args.task_id) else {
            return "⚠︎ task_id is not a valid UUID."
        }
        let updated = try await TaskRepository.shared.updateTask(id: id, patch: [
            "due_at":       AnyJSON(args.new_due),
            "due_has_time": AnyJSON(args.has_time ?? true)
        ])
        let f = DateFormatter()
        f.dateStyle = .medium; f.timeStyle = args.has_time == false ? .none : .short
        return "✓ '\(updated.title)' rescheduled to \(f.string(from: args.new_due))."
    }
}

public struct DeferTaskTool: AgentTool {
    public init() {}

    public let spec = ToolSpec(
        name: "defer_task",
        description: "Gently push a task forward by N days (no guilt, no red). Use when the user feels overwhelmed or unsure.",
        parametersJSON: """
        {
          "type": "object",
          "properties": {
            "task_id":   { "type": "string" },
            "days":      { "type": "integer", "minimum": 1, "maximum": 90 },
            "until_date":{ "type": "string", "description": "Alternative: ISO-8601 date to defer until." }
          },
          "required": ["task_id"]
        }
        """
    )

    private struct Args: Decodable {
        let task_id: String
        let days: Int?
        let until_date: Date?
    }

    public func execute(argumentsJSON: String, context: AgentContext) async throws -> String {
        let args = try decodeArgs(Args.self, json: argumentsJSON)
        guard let id = UUID(uuidString: args.task_id) else {
            return "⚠︎ task_id is not a valid UUID."
        }

        let target: Date
        if let until = args.until_date {
            target = until
        } else {
            let days = args.days ?? 1
            target = Calendar.current.date(byAdding: .day, value: days, to: .now) ?? .now
        }

        let updated = try await TaskRepository.shared.updateTask(id: id, patch: [
            "due_at": AnyJSON(target),
            "due_has_time": AnyJSON(false)
        ])
        let f = DateFormatter(); f.dateStyle = .medium
        let tone = context.locale == "fr" ? "Déféré à" : "Deferred to"
        return "✓ '\(updated.title)' — \(tone) \(f.string(from: target))."
    }
}
