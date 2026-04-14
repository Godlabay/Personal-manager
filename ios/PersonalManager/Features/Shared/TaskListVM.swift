import Foundation
import SwiftUI
import Supabase

/// Shared view model for the three flat task lists: Inbox, Today, Upcoming.
/// Reads directly from Supabase via `TaskRepository` (Phase 1 keeps it simple —
/// the SwiftData cache is populated by `SyncEngine` for offline reads, but the
/// feature views hit the network each time they appear so the UI stays fresh
/// even if the cache is stale).
@MainActor
public final class TaskListVM: ObservableObject {
    @Published public private(set) var tasks: [TaskDTO] = []
    @Published public private(set) var isLoading: Bool = false
    @Published public private(set) var error: String?

    public let filter: TaskFilter

    public init(filter: TaskFilter) {
        self.filter = filter
    }

    public func reload() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let raw = try await TaskRepository.shared.fetchTasks(filter: filter)
            // Small-first within the same priority: shorter estimates bubble up.
            tasks = raw.sorted { a, b in
                if a.priority != b.priority { return a.priority > b.priority }
                let ae = a.estimatedMinutes ?? Int.max
                let be = b.estimatedMinutes ?? Int.max
                if ae != be { return ae < be }
                switch (a.dueAt, b.dueAt) {
                case let (.some(x), .some(y)): return x < y
                case (.some, .none):           return true
                case (.none, .some):           return false
                default:                       return a.sortOrder < b.sortOrder
                }
            }
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    public func toggleDone(_ task: TaskDTO) async {
        let nextStatus: String = (task.status == "done") ? "open" : "done"
        var patch: [String: AnyJSON] = ["status": AnyJSON(nextStatus)]
        patch["completed_at"] = nextStatus == "done" ? AnyJSON(Date()) : AnyJSON.null
        do {
            let updated = try await TaskRepository.shared.updateTask(id: task.id, patch: patch)
            if let i = tasks.firstIndex(where: { $0.id == updated.id }) {
                tasks[i] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
