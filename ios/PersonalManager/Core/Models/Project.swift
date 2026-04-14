import Foundation
import SwiftData

@Model
public final class Project {
    @Attribute(.unique) public var id: UUID
    public var userId: UUID
    public var name: String
    public var color: String?
    public var icon: String?
    public var viewModeRaw: String
    public var archived: Bool
    public var sortOrder: Double
    public var createdAt: Date
    public var updatedAt: Date

    // Local-only: tracks whether the row is pending upload / needs fetch.
    public var pendingSync: Bool

    @Relationship(deleteRule: .cascade, inverse: \Section.project)
    public var sections: [Section] = []

    @Relationship(deleteRule: .nullify, inverse: \TaskItem.project)
    public var tasks: [TaskItem] = []

    public init(
        id: UUID = UUID(),
        userId: UUID,
        name: String,
        color: String? = nil,
        icon: String? = nil,
        viewMode: ProjectViewMode = .list,
        archived: Bool = false,
        sortOrder: Double = 0,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        pendingSync: Bool = true
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.color = color
        self.icon = icon
        self.viewModeRaw = viewMode.rawValue
        self.archived = archived
        self.sortOrder = sortOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.pendingSync = pendingSync
    }

    public var viewMode: ProjectViewMode {
        get { ProjectViewMode(rawValue: viewModeRaw) ?? .list }
        set { viewModeRaw = newValue.rawValue }
    }
}
