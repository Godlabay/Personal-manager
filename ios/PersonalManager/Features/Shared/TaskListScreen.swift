import SwiftUI

/// Reusable task list screen. Inbox/Today/Upcoming all compose this.
/// Taps the flame icon → opens a `FocusSessionView` for that task.
public struct TaskListScreen: View {
    public let titleKey: LocalizedStringKey
    public let emptyImage: String
    public let emptyTitleKey: LocalizedStringKey
    public let emptySubtitleKey: LocalizedStringKey?
    public let filter: TaskFilter

    @StateObject private var vm: TaskListVM
    @EnvironmentObject private var auth: AuthService
    @Environment(\.theme) private var theme

    @State private var focusTask: TaskDTO?
    @State private var showQuickAdd = false

    public init(
        titleKey: LocalizedStringKey,
        emptyImage: String,
        emptyTitleKey: LocalizedStringKey,
        emptySubtitleKey: LocalizedStringKey?,
        filter: TaskFilter
    ) {
        self.titleKey = titleKey
        self.emptyImage = emptyImage
        self.emptyTitleKey = emptyTitleKey
        self.emptySubtitleKey = emptySubtitleKey
        self.filter = filter
        _vm = StateObject(wrappedValue: TaskListVM(filter: filter))
    }

    public var body: some View {
        ZStack {
            theme.palette.background.ignoresSafeArea()
            content
        }
        .navigationTitle(titleKey)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showQuickAdd = true } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(theme.palette.accent)
                }
            }
        }
        .task { await vm.reload() }
        .refreshable { await vm.reload() }
        .sheet(isPresented: $showQuickAdd, onDismiss: { Task { await vm.reload() } }) {
            QuickAddView()
        }
        .fullScreenCover(item: $focusTask) { task in
            if let userId = auth.user?.id {
                FocusSessionView(
                    userId: userId,
                    prefillTaskId: task.id,
                    prefillTaskTitle: task.title,
                    prefillDurationMinutes: task.estimatedMinutes.map { max(5, min($0, 180)) }
                )
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if vm.tasks.isEmpty && !vm.isLoading {
            EmptyState(systemImage: emptyImage, title: emptyTitleKey, subtitle: emptySubtitleKey)
        } else {
            ScrollView {
                LazyVStack(spacing: Spacing.sm) {
                    ForEach(vm.tasks) { task in
                        TaskRow(
                            title: task.title,
                            priority: task.priority,
                            dueLabel: task.dueAt.map { Self.formatDue($0, hasTime: task.dueHasTime) },
                            projectName: nil,
                            labels: [],
                            isDone: task.status == "done",
                            onToggle: { Task { await vm.toggleDone(task) } },
                            onFocus: { focusTask = task }
                        )
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.xxxl)
            }
        }
    }

    private static func formatDue(_ date: Date, hasTime: Bool) -> String {
        let f = DateFormatter()
        if Calendar.current.isDateInToday(date) {
            return hasTime ? date.formatted(date: .omitted, time: .shortened) : "Today"
        }
        if Calendar.current.isDateInTomorrow(date) {
            return hasTime ? "Tomorrow \(date.formatted(date: .omitted, time: .shortened))" : "Tomorrow"
        }
        f.dateStyle = .medium
        f.timeStyle = hasTime ? .short : .none
        return f.string(from: date)
    }
}

