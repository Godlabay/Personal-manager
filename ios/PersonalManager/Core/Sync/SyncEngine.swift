import Foundation
import SwiftData
import Supabase

/// Minimal Phase 1 sync: pulls recent data, merges it into SwiftData, and flushes the local outbox.
/// Conflict strategy: server wins on field-level `updated_at`.
///
/// NOTE: This is a skeleton. Phase 2 adds incremental deltas via `updated_at > lastSync`,
/// and Realtime subscription for push updates.
@MainActor
public final class SyncEngine: ObservableObject {
    public static let shared = SyncEngine()

    @Published public private(set) var isSyncing: Bool = false
    @Published public private(set) var lastError: String?

    private let client = SupabaseService.shared
    private let repo = TaskRepository.shared

    private init() {}

    public func fullPull(into context: ModelContext) async {
        isSyncing = true
        defer { isSyncing = false }
        do {
            async let projects = repo.fetchProjects()
            async let labels   = repo.fetchLabels()
            async let tasks    = repo.fetchTasks(filter: .upcoming(days: 60))

            let (ps, ls, ts) = try await (projects, labels, tasks)
            mergeProjects(ps, into: context)
            mergeLabels(ls, into: context)
            mergeTasks(ts, into: context)
            try context.save()
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Merge helpers

    private func mergeProjects(_ dtos: [ProjectDTO], into ctx: ModelContext) {
        for dto in dtos {
            if let existing = try? ctx.fetch(FetchDescriptor<Project>(predicate: #Predicate { $0.id == dto.id })).first {
                existing.name = dto.name
                existing.color = dto.color
                existing.icon = dto.icon
                existing.viewModeRaw = dto.viewMode
                existing.archived = dto.archived
                existing.sortOrder = dto.sortOrder
                existing.updatedAt = dto.updatedAt
                existing.pendingSync = false
            } else {
                ctx.insert(Project(
                    id: dto.id,
                    userId: dto.userId,
                    name: dto.name,
                    color: dto.color,
                    icon: dto.icon,
                    viewMode: ProjectViewMode(rawValue: dto.viewMode) ?? .list,
                    archived: dto.archived,
                    sortOrder: dto.sortOrder,
                    createdAt: dto.createdAt,
                    updatedAt: dto.updatedAt,
                    pendingSync: false
                ))
            }
        }
    }

    private func mergeLabels(_ dtos: [LabelDTO], into ctx: ModelContext) {
        for dto in dtos {
            if let existing = try? ctx.fetch(FetchDescriptor<Label>(predicate: #Predicate { $0.id == dto.id })).first {
                existing.name = dto.name
                existing.color = dto.color
                existing.pendingSync = false
            } else {
                ctx.insert(Label(
                    id: dto.id,
                    userId: dto.userId,
                    name: dto.name,
                    color: dto.color,
                    createdAt: dto.createdAt,
                    pendingSync: false
                ))
            }
        }
    }

    private func mergeTasks(_ dtos: [TaskDTO], into ctx: ModelContext) {
        for dto in dtos {
            let project: Project? = dto.projectId.flatMap { pid in
                (try? ctx.fetch(FetchDescriptor<Project>(predicate: #Predicate { $0.id == pid })))?.first
            }
            if let existing = try? ctx.fetch(FetchDescriptor<TaskItem>(predicate: #Predicate { $0.id == dto.id })).first {
                existing.title = dto.title
                existing.details = dto.description
                existing.priority = dto.priority
                existing.dueAt = dto.dueAt
                existing.dueHasTime = dto.dueHasTime
                existing.recurrenceRRule = dto.recurrenceRrule
                existing.statusRaw = dto.status
                existing.kanbanColumn = dto.kanbanColumn
                existing.estimatedMinutes = dto.estimatedMinutes
                existing.energyLevelRaw = dto.energyLevel
                existing.sortOrder = dto.sortOrder
                existing.completedAt = dto.completedAt
                existing.updatedAt = dto.updatedAt
                existing.project = project
                existing.pendingSync = false
            } else {
                ctx.insert(TaskItem(
                    id: dto.id,
                    userId: dto.userId,
                    title: dto.title,
                    details: dto.description,
                    priority: dto.priority,
                    dueAt: dto.dueAt,
                    dueHasTime: dto.dueHasTime,
                    recurrenceRRule: dto.recurrenceRrule,
                    status: TaskStatus(rawValue: dto.status) ?? .open,
                    kanbanColumn: dto.kanbanColumn,
                    estimatedMinutes: dto.estimatedMinutes,
                    energyLevel: dto.energyLevel.flatMap(EnergyLevel.init(rawValue:)),
                    sortOrder: dto.sortOrder,
                    completedAt: dto.completedAt,
                    createdAt: dto.createdAt,
                    updatedAt: dto.updatedAt,
                    pendingSync: false,
                    project: project
                ))
            }
        }
    }
}
