import SwiftUI

/// Five-tab root: Today / Upcoming / Projects / AI / Settings.
/// Long-press on the AI tab opens the hold-to-speak voice capture sheet for a
/// friction-free brain dump that routes to QuickAdd.
public struct RootTabView: View {
    @EnvironmentObject private var registry: ProviderRegistry
    @State private var selection: Tab = .today
    @State private var showVoice = false
    @State private var voiceDraft: String = ""
    @State private var showQuickAddFromVoice = false

    public enum Tab: Hashable { case today, upcoming, projects, ai, settings }

    public init() {}

    public var body: some View {
        TabView(selection: $selection) {
            TodayView()
                .tabItem { Label("tab.today", systemImage: "sun.max") }
                .tag(Tab.today)

            UpcomingView()
                .tabItem { Label("tab.upcoming", systemImage: "calendar") }
                .tag(Tab.upcoming)

            ProjectsView()
                .tabItem { Label("tab.projects", systemImage: "folder") }
                .tag(Tab.projects)

            AIChatView(systemPrompt: SystemPromptLoader.load())
                .tabItem { Label("tab.ai", systemImage: "sparkles") }
                .tag(Tab.ai)
                .onLongPressGesture { showVoice = true }

            SettingsView()
                .tabItem { Label("settings.title", systemImage: "gearshape") }
                .tag(Tab.settings)
        }
        .sheet(isPresented: $showVoice) {
            VoiceCaptureView { text in
                voiceDraft = text
                showQuickAddFromVoice = !text.isEmpty
            }
        }
        .sheet(isPresented: $showQuickAddFromVoice) {
            QuickAddView(initialText: voiceDraft)
        }
    }
}

/// Loads `prompts/system.md` from the bundle — falls back to an inline minimal prompt
/// so the agent still behaves reasonably if the file is missing.
enum SystemPromptLoader {
    static func load() -> String {
        if let url = Bundle.main.url(forResource: "system", withExtension: "md"),
           let text = try? String(contentsOf: url, encoding: .utf8) {
            return text
        }
        return """
        You are a warm, ADHD-aware task coach. Speak in the user's language (French or English).
        Keep replies short. Use the tools to manipulate tasks — don't describe, do.
        Never shame the user for being late or overwhelmed. Offer one next step.
        """
    }
}
