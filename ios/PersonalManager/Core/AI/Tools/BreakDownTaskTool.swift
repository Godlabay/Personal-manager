import Foundation

/// Breaks a task into subtasks. Phase 1: the agent is expected to pass the already-generated
/// subtitles (the LLM generates them from its own reasoning). We simply persist them.
public struct BreakDownTaskTool: AgentTool {
    public init() {}

    public let spec = ToolSpec(
        name: "break_down_task",
        description: "Split a large task into smaller, concrete subtasks. You decide the subtask titles and pass them in. 2 to 7 subtasks is usually the sweet spot for ADHD brains.",
        parametersJSON: """
        {
          "type": "object",
          "properties": {
            "parent_task_id": { "type": "string", "description": "UUID of the task to decompose." },
            "subtasks":       {
              "type": "array",
              "minItems": 2,
              "maxItems": 8,
              "items": {
                "type": "object",
                "properties": {
                  "title":             { "type": "string" },
                  "estimated_minutes": { "type": "integer" }
                },
                "required": ["title"]
              }
            }
          },
          "required": ["parent_task_id", "subtasks"]
        }
        """
    )

    private struct Args: Decodable {
        struct Sub: Decodable {
            let title: String
            let estimated_minutes: Int?
        }
        let parent_task_id: String
        let subtasks: [Sub]
    }

    public func execute(argumentsJSON: String, context: AgentContext) async throws -> String {
        let args = try decodeArgs(Args.self, json: argumentsJSON)
        guard let parentId = UUID(uuidString: args.parent_task_id) else {
            return "⚠︎ parent_task_id is not a valid UUID."
        }

        // Fetch parent to inherit project + priority.
        let parents = try await TaskRepository.shared.fetchTasks(filter: .byId(ids: [parentId]))
        guard let parent = parents.first else {
            return "⚠︎ Parent task not found (id=\(parentId.uuidString))."
        }

        var inserted = 0
        for (idx, sub) in args.subtasks.enumerated() {
            let dto = TaskDTO(
                id: UUID(),
                userId: context.userId,
                projectId: parent.projectId,
                sectionId: parent.sectionId,
                parentTaskId: parent.id,
                title: sub.title,
                description: nil,
                priority: parent.priority,
                dueAt: parent.dueAt,
                dueHasTime: parent.dueHasTime,
                recurrenceRrule: nil,
                status: "open",
                kanbanColumn: nil,
                estimatedMinutes: sub.estimated_minutes,
                energyLevel: parent.energyLevel,
                sortOrder: Double(idx),
                completedAt: nil,
                createdAt: .now,
                updatedAt: .now
            )
            _ = try await TaskRepository.shared.createTask(dto)
            inserted += 1
        }

        return "✓ Broke down '\(parent.title)' into \(inserted) subtasks."
    }
}
