import Foundation

public struct CreateTaskTool: AgentTool {
    public init() {}

    public let spec = ToolSpec(
        name: "create_task",
        description: "Create a new task in the user's list. Use this whenever the user wants to capture something to do. Pass a clean title, optional project name (must exactly match an existing one), optional ISO-8601 due date, optional priority 1-4, optional labels, optional estimated duration in minutes, optional energy level.",
        parametersJSON: """
        {
          "type": "object",
          "properties": {
            "title":             { "type": "string", "description": "Short, imperative task title." },
            "project":           { "type": "string", "description": "Project name if the task belongs to one." },
            "due_at":            { "type": "string", "description": "ISO-8601 timestamp, e.g. 2025-05-20T14:00:00Z. Omit if no due date." },
            "due_has_time":      { "type": "boolean", "description": "True if the user specified a time of day, false if only a date." },
            "priority":          { "type": "integer", "minimum": 1, "maximum": 4 },
            "labels":            { "type": "array", "items": { "type": "string" } },
            "estimated_minutes": { "type": "integer" },
            "energy_level":      { "type": "string", "enum": ["low", "medium", "high"] }
          },
          "required": ["title"]
        }
        """
    )

    private struct Args: Decodable {
        let title: String
        let project: String?
        let due_at: Date?
        let due_has_time: Bool?
        let priority: Int?
        let labels: [String]?
        let estimated_minutes: Int?
        let energy_level: String?
    }

    public func execute(argumentsJSON: String, context: AgentContext) async throws -> String {
        let args = try decodeArgs(Args.self, json: argumentsJSON)

        var projectId: UUID? = nil
        if let name = args.project {
            let projects = try await TaskRepository.shared.fetchProjects()
            projectId = projects.first(where: { $0.name.localizedCaseInsensitiveCompare(name) == .orderedSame })?.id
        }

        let dto = TaskDTO(
            id: UUID(),
            userId: context.userId,
            projectId: projectId,
            sectionId: nil,
            parentTaskId: nil,
            title: args.title,
            description: nil,
            priority: args.priority ?? 1,
            dueAt: args.due_at,
            dueHasTime: args.due_has_time ?? (args.due_at != nil),
            recurrenceRrule: nil,
            status: "open",
            kanbanColumn: nil,
            estimatedMinutes: args.estimated_minutes,
            energyLevel: args.energy_level,
            sortOrder: 0,
            completedAt: nil,
            createdAt: .now,
            updatedAt: .now
        )
        let saved = try await TaskRepository.shared.createTask(dto)

        let dueLabel = saved.dueAt.map { Self.formatDue($0, hasTime: saved.dueHasTime) } ?? "—"
        return "✓ Created task '\(saved.title)' (priority P\(saved.priority), due \(dueLabel))."
    }

    private static func formatDue(_ date: Date, hasTime: Bool) -> String {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = hasTime ? .short : .none
        return f.string(from: date)
    }
}
