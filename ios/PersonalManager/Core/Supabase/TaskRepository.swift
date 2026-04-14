import Foundation
import Supabase

/// Thin wrapper over Postgrest for the CRUD calls the tools and sync engine make.
/// All reads/writes go through RLS — the `user_id` column must match `auth.uid()`.
public struct TaskRepository {
    public static let shared = TaskRepository()

    private let client = SupabaseService.shared

    // MARK: - Tasks

    public func createTask(_ dto: TaskDTO) async throws -> TaskDTO {
        try await client
            .from("tasks")
            .insert(dto, returning: .representation)
            .select()
            .single()
            .execute()
            .value
    }

    public func updateTask(id: UUID, patch: [String: AnyJSON]) async throws -> TaskDTO {
        try await client
            .from("tasks")
            .update(patch, returning: .representation)
            .eq("id", value: id)
            .select()
            .single()
            .execute()
            .value
    }

    public func deleteTask(id: UUID) async throws {
        _ = try await client
            .from("tasks")
            .delete()
            .eq("id", value: id)
            .execute()
    }

    public func fetchTasks(filter: TaskFilter) async throws -> [TaskDTO] {
        var query = client.from("tasks").select()

        switch filter {
        case .inbox:
            query = query.is("project_id", value: nil).eq("status", value: "open")
        case .today:
            let (start, end) = Self.todayBounds()
            query = query.gte("due_at", value: start).lt("due_at", value: end).eq("status", value: "open")
        case .upcoming(let days):
            let (start, end) = Self.upcomingBounds(days: days)
            query = query.gte("due_at", value: start).lt("due_at", value: end).eq("status", value: "open")
        case .overdue:
            query = query.lt("due_at", value: Date()).eq("status", value: "open")
        case .project(let id):
            query = query.eq("project_id", value: id).eq("status", value: "open")
        case .byId(let ids):
            query = query.in("id", values: ids.map { $0.uuidString })
        }

        return try await query
            .order("priority", ascending: false)
            .order("due_at", ascending: true, nullsFirst: false)
            .order("sort_order", ascending: true)
            .execute()
            .value
    }

    // MARK: - Projects & labels

    public func fetchProjects() async throws -> [ProjectDTO] {
        try await client.from("projects")
            .select()
            .eq("archived", value: false)
            .order("sort_order")
            .execute().value
    }

    public func createProject(_ dto: ProjectDTO) async throws -> ProjectDTO {
        try await client.from("projects")
            .insert(dto, returning: .representation)
            .select().single().execute().value
    }

    public func fetchLabels() async throws -> [LabelDTO] {
        try await client.from("labels").select().order("name").execute().value
    }

    // MARK: - Time entries (focus sessions)

    public func logTimeEntry(taskId: UUID?, startedAt: Date, endedAt: Date, ambience: String?, userId: UUID) async throws {
        struct TimeEntryInsert: Codable {
            let task_id: UUID?
            let user_id: UUID
            let started_at: Date
            let ended_at: Date
            let duration_s: Int
            let kind: String
            let ambience: String?
        }
        let entry = TimeEntryInsert(
            task_id: taskId,
            user_id: userId,
            started_at: startedAt,
            ended_at: endedAt,
            duration_s: Int(endedAt.timeIntervalSince(startedAt)),
            kind: "focus",
            ambience: ambience
        )
        _ = try await client.from("time_entries").insert(entry).execute()
    }

    // MARK: - Helpers

    private static func todayBounds() -> (Date, Date) {
        let cal = Calendar.current
        let start = cal.startOfDay(for: .now)
        let end = cal.date(byAdding: .day, value: 1, to: start)!
        return (start, end)
    }

    private static func upcomingBounds(days: Int) -> (Date, Date) {
        let cal = Calendar.current
        let start = cal.startOfDay(for: .now)
        let end = cal.date(byAdding: .day, value: days, to: start)!
        return (start, end)
    }
}

public enum TaskFilter: Sendable, Equatable {
    case inbox
    case today
    case upcoming(days: Int)
    case overdue
    case project(id: UUID)
    case byId(ids: [UUID])
}
