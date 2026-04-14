import Foundation

public enum TaskStatus: String, Codable, Sendable, CaseIterable {
    case open
    case done
    case cancelled
}

public enum EnergyLevel: String, Codable, Sendable, CaseIterable {
    case low
    case medium
    case high
}

public enum ProjectViewMode: String, Codable, Sendable, CaseIterable {
    case list
    case kanban
    case gantt
    case calendar
}

public enum ReminderKind: String, Codable, Sendable, CaseIterable {
    case time
    case location
}
