import Foundation

/// Top-level URL router. Currently handles magic-link auth callbacks.
/// Phase 2 will extend this for deep links into specific tasks/projects.
public enum AppRouter {
    public static func handle(_ url: URL, auth: AuthService) async {
        guard url.scheme == AppConfig.authRedirectURL.scheme else { return }
        await auth.handleAuthURL(url)
    }
}
