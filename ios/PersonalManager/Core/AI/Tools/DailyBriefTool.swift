import Foundation

/// Reads the user's current tasks and returns a compact snapshot the model uses
/// to write a warm, ADHD-friendly morning brief.
public struct DailyBriefTool: AgentTool {
    public init() {}

    public let spec = ToolSpec(
        name: "daily_brief",
        description: "Fetch today's tasks, overdue items, and a small sample of upcoming ones so you can produce a gentle morning brief. Call this ONCE per conversation, then write the brief yourself.",
        parametersJSON: """
        {
          "type": "object",
          "properties": {
            "max_upcoming": { "type": "integer", "default": 5 }
          }
        }
        """
    )

    private struct Args: Decodable { let max_upcoming: Int? }

    public func execute(argumentsJSON: String, context: AgentContext) async throws -> String {
        let args = (try? decodeArgs(Args.self, json: argumentsJSON)) ?? Args(max_upcoming: 5)

        async let today    = TaskRepository.shared.fetchTasks(filter: .today)
        async let overdue  = TaskRepository.shared.fetchTasks(filter: .overdue)
        async let upcoming = TaskRepository.shared.fetchTasks(filter: .upcoming(days: 7))

        let (t, o, u) = try await (today, overdue, upcoming)

        let snapshot = Snapshot(
            today:    t.map(Self.summary),
            overdue:  o.map(Self.summary),
            upcoming: Array(u.prefix(args.max_upcoming ?? 5)).map(Self.summary)
        )
        let data = try JSONEncoder().encode(snapshot)
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    private struct Snapshot: Encodable {
        let today: [TaskSummary]
        let overdue: [TaskSummary]
        let upcoming: [TaskSummary]
    }
    private struct TaskSummary: Encodable {
        let id: String
        let title: String
        let priority: Int
        let due_at: String?
        let estimated_minutes: Int?
        let energy_level: String?
    }
    private static func summary(_ t: TaskDTO) -> TaskSummary {
        let iso = ISO8601DateFormatter()
        return TaskSummary(
            id: t.id.uuidString,
            title: t.title,
            priority: t.priority,
            due_at: t.dueAt.map { iso.string(from: $0) },
            estimated_minutes: t.estimatedMinutes,
            energy_level: t.energyLevel
        )
    }
}
