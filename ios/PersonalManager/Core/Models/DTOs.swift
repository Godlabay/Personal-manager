import Foundation

// MARK: - Wire DTOs for Supabase Postgrest
//
// These mirror the SQL schema column names (snake_case via CodingKeys).
// They're separate from the SwiftData @Models so we can round-trip cleanly
// and so the rest of the app doesn't depend on Postgrest details.

public struct TaskDTO: Codable, Sendable, Identifiable {
    public var id: UUID
    public var userId: UUID
    public var projectId: UUID?
    public var sectionId: UUID?
    public var parentTaskId: UUID?
    public var title: String
    public var description: String?
    public var priority: Int
    public var dueAt: Date?
    public var dueHasTime: Bool
    public var recurrenceRrule: String?
    public var status: String
    public var kanbanColumn: String?
    public var estimatedMinutes: Int?
    public var energyLevel: String?
    public var sortOrder: Double
    public var completedAt: Date?
    public var createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId           = "user_id"
        case projectId        = "project_id"
        case sectionId        = "section_id"
        case parentTaskId     = "parent_task_id"
        case title
        case description
        case priority
        case dueAt            = "due_at"
        case dueHasTime       = "due_has_time"
        case recurrenceRrule  = "recurrence_rrule"
        case status
        case kanbanColumn     = "kanban_column"
        case estimatedMinutes = "estimated_minutes"
        case energyLevel      = "energy_level"
        case sortOrder        = "sort_order"
        case completedAt      = "completed_at"
        case createdAt        = "created_at"
        case updatedAt        = "updated_at"
    }
}

public struct ProjectDTO: Codable, Sendable, Identifiable {
    public var id: UUID
    public var userId: UUID
    public var name: String
    public var color: String?
    public var icon: String?
    public var viewMode: String
    public var archived: Bool
    public var sortOrder: Double
    public var createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId     = "user_id"
        case name
        case color
        case icon
        case viewMode   = "view_mode"
        case archived
        case sortOrder  = "sort_order"
        case createdAt  = "created_at"
        case updatedAt  = "updated_at"
    }
}

public struct LabelDTO: Codable, Sendable, Identifiable {
    public var id: UUID
    public var userId: UUID
    public var name: String
    public var color: String?
    public var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId    = "user_id"
        case name
        case color
        case createdAt = "created_at"
    }
}

public struct SectionDTO: Codable, Sendable, Identifiable {
    public var id: UUID
    public var projectId: UUID
    public var name: String
    public var sortOrder: Double
    public var createdAt: Date
    public var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case name
        case sortOrder = "sort_order"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

public struct UserProfileDTO: Codable, Sendable {
    public var userId: UUID
    public var displayName: String?
    public var locale: String?
    public var tz: String?
    public var karma: Int
    public var currentStreak: Int
    public var longestStreak: Int

    enum CodingKeys: String, CodingKey {
        case userId         = "user_id"
        case displayName    = "display_name"
        case locale
        case tz
        case karma
        case currentStreak  = "current_streak"
        case longestStreak  = "longest_streak"
    }
}
