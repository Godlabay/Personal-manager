import SwiftUI
import SwiftData

@main
struct PersonalManagerApp: App {
    @StateObject private var auth = AuthService.shared
    @StateObject private var themeManager = ThemeManager()
    @StateObject private var registry = ProviderRegistry.shared
    @Environment(\.colorScheme) private var colorScheme

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(themeManager)
                .environmentObject(registry)
                .applyTheme(themeManager.current)
                .onChange(of: colorScheme) { _, new in
                    themeManager.systemScheme = new
                }
                .onOpenURL { url in
                    Task { await AppRouter.handle(url, auth: auth) }
                }
        }
        .modelContainer(for: [TaskItem.self, Project.self, Section.self, Label.self])
    }
}

/// Splits on auth state: show sign-in, or the main tabs.
private struct RootView: View {
    @EnvironmentObject private var auth: AuthService

    var body: some View {
        Group {
            if auth.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if auth.isSignedIn {
                RootTabView()
            } else {
                SignInView()
            }
        }
    }
}
