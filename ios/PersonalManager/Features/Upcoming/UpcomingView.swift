import SwiftUI

public struct UpcomingView: View {
    public init() {}
    public var body: some View {
        NavigationStack {
            TaskListScreen(
                titleKey: "tab.upcoming",
                emptyImage: "calendar",
                emptyTitleKey: "upcoming.empty.title",
                emptySubtitleKey: "upcoming.empty.subtitle",
                filter: .upcoming(days: 14)
            )
        }
    }
}
