import Foundation
import SwiftData

/// Named `TaskItem` to avoid colliding with Swift Concurrency's `Task`.
@Model
public final class TaskItem {
    @Attribute(.unique) public var id: UUID
    public var userId: UUID

    public var title: String
    public var details: String?

    public var priority: Int          // 1..4
    public var dueAt: Date?
    public var dueHasTime: Bool
    public var recurrenceRRule: String?

    public var statusRaw: String
    public var kanbanColumn: String?
    public var estimatedMinutes: Int?
    public var energyLevelRaw: String?

    public var sortOrder: Double
    public var completedAt: Date?
    public var createdAt: Date
    public var updatedAt: Date

    public var pendingSync: Bool

    // Relationships
    public var project: Project?
    public var section: Section?
    public var parent: TaskItem?

    @Relationship(deleteRule: .cascade, inverse: \TaskItem.parent)
    public var subtasks: [TaskItem] = []

    // Labels are stored as a simple name array for fast rendering.
    // The join table in Postgres is reconciled by the SyncEngine.
    public var labelNames: [String] = []

    public init(
        id: UUID = UUID(),
        userId: UUID,
        title: String,
        details: String? = nil,
        priority: Int = 1,
        dueAt: Date? = nil,
        dueHasTime: Bool = false,
        recurrenceRRule: String? = nil,
        status: TaskStatus = .open,
        kanbanColumn: String? = nil,
        estimatedMinutes: Int? = nil,
        energyLevel: EnergyLevel? = nil,
        sortOrder: Double = 0,
        completedAt: Date? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        pendingSync: Bool = true,
        project: Project? = nil,
        section: Section? = nil,
        parent: TaskItem? = nil,
        labelNames: [String] = []
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.details = details
        self.priority = priority
        self.dueAt = dueAt
        self.dueHasTime = dueHasTime
        self.recurrenceRRule = recurrenceRRule
        self.statusRaw = status.rawValue
        self.kanbanColumn = kanbanColumn
        self.estimatedMinutes = estimatedMinutes
        self.energyLevelRaw = energyLevel?.rawValue
        self.sortOrder = sortOrder
        self.completedAt = completedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.pendingSync = pendingSync
        self.project = project
        self.section = section
        self.parent = parent
        self.labelNames = labelNames
    }

    public var status: TaskStatus {
        get { TaskStatus(rawValue: statusRaw) ?? .open }
        set { statusRaw = newValue.rawValue }
    }

    public var energyLevel: EnergyLevel? {
        get { energyLevelRaw.flatMap(EnergyLevel.init(rawValue:)) }
        set { energyLevelRaw = newValue?.rawValue }
    }

    public var isDone: Bool {
        status == .done
    }

    public var isOverdue: Bool {
        guard let due = dueAt, status == .open else { return false }
        return due < .now
    }
}
