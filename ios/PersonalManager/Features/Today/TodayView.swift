import SwiftUI

public struct TodayView: View {
    public init() {}
    public var body: some View {
        NavigationStack {
            TaskListScreen(
                titleKey: "tab.today",
                emptyImage: "sun.max",
                emptyTitleKey: "today.empty.title",
                emptySubtitleKey: "today.empty.subtitle",
                filter: .today
            )
        }
    }
}
