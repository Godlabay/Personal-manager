import SwiftUI

@MainActor
public final class ProjectsVM: ObservableObject {
    @Published public private(set) var projects: [ProjectDTO] = []
    @Published public private(set) var isLoading = false
    @Published public private(set) var error: String?

    public init() {}

    public func reload() async {
        isLoading = true; defer { isLoading = false }
        do {
            projects = try await TaskRepository.shared.fetchProjects()
            error = nil
        } catch { self.error = error.localizedDescription }
    }
}

public struct ProjectsView: View {
    @StateObject private var vm = ProjectsVM()
    @Environment(\.theme) private var theme

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                theme.palette.background.ignoresSafeArea()
                if vm.projects.isEmpty && !vm.isLoading {
                    EmptyState(
                        systemImage: "folder",
                        title: "projects.empty.title",
                        subtitle: "projects.empty.subtitle"
                    )
                } else {
                    List {
                        ForEach(vm.projects) { p in
                            NavigationLink(destination: ProjectDetailView(project: p)) {
                                HStack(spacing: Spacing.md) {
                                    Image(systemName: p.icon ?? "folder.fill")
                                        .foregroundStyle(theme.palette.accent)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(p.name).font(AppFont.headline())
                                        Text(p.viewMode.capitalized)
                                            .font(AppFont.caption())
                                            .foregroundStyle(theme.palette.textSecondary)
                                    }
                                }
                            }
                            .listRowBackground(theme.palette.surface)
                        }
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("tab.projects")
            .task { await vm.reload() }
            .refreshable { await vm.reload() }
        }
    }
}

public struct ProjectDetailView: View {
    public let project: ProjectDTO
    @Environment(\.theme) private var theme

    public init(project: ProjectDTO) { self.project = project }

    public var body: some View {
        TaskListScreen(
            titleKey: LocalizedStringKey(project.name),
            emptyImage: "folder",
            emptyTitleKey: "project.empty.title",
            emptySubtitleKey: "project.empty.subtitle",
            filter: .project(id: project.id)
        )
    }
}
