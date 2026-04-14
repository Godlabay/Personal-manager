import SwiftUI

public struct InboxView: View {
    public init() {}
    public var body: some View {
        NavigationStack {
            TaskListScreen(
                titleKey: "tab.inbox",
                emptyImage: "tray",
                emptyTitleKey: "inbox.empty.title",
                emptySubtitleKey: "inbox.empty.subtitle",
                filter: .inbox
            )
        }
    }
}
