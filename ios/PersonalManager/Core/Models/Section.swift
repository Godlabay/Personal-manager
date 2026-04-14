import Foundation
import SwiftData

@Model
public final class Section {
    @Attribute(.unique) public var id: UUID
    public var name: String
    public var sortOrder: Double
    public var createdAt: Date
    public var updatedAt: Date
    public var pendingSync: Bool

    public var project: Project?

    public init(
        id: UUID = UUID(),
        name: String,
        sortOrder: Double = 0,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        pendingSync: Bool = true,
        project: Project? = nil
    ) {
        self.id = id
        self.name = name
        self.sortOrder = sortOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.pendingSync = pendingSync
        self.project = project
    }
}
