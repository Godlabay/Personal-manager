import Foundation
import SwiftData

@Model
public final class Label {
    @Attribute(.unique) public var id: UUID
    public var userId: UUID
    public var name: String
    public var color: String?
    public var createdAt: Date
    public var pendingSync: Bool

    public init(
        id: UUID = UUID(),
        userId: UUID,
        name: String,
        color: String? = nil,
        createdAt: Date = .now,
        pendingSync: Bool = true
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.color = color
        self.createdAt = createdAt
        self.pendingSync = pendingSync
    }
}
