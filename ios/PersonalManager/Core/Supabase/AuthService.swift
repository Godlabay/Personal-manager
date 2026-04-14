import Foundation
import Supabase

@MainActor
public final class AuthService: ObservableObject {
    public static let shared = AuthService()

    @Published public private(set) var session: Session?
    @Published public private(set) var isLoading: Bool = true

    private var authTask: Task<Void, Never>?
    private let client = SupabaseService.shared

    private init() {
        authTask = Task { [weak self] in
            guard let self else { return }
            for await (event, session) in client.auth.authStateChanges {
                _ = event
                self.session = session
                self.isLoading = false
            }
        }
    }

    deinit { authTask?.cancel() }

    public var user: User? { session?.user }
    public var isSignedIn: Bool { session != nil }

    /// Request a magic-link OTP email. User taps the link which returns to `personalmanager://auth-callback`.
    public func requestMagicLink(email: String) async throws {
        try await client.auth.signInWithOTP(
            email: email.trimmingCharacters(in: .whitespaces),
            redirectTo: AppConfig.authRedirectURL,
            shouldCreateUser: true
        )
    }

    /// Handle the deep link returned from the magic-link click.
    public func handleAuthURL(_ url: URL) async {
        do {
            try await client.auth.session(from: url)
        } catch {
            assertionFailure("Magic-link exchange failed: \(error)")
        }
    }

    public func signOut() async {
        try? await client.auth.signOut()
    }
}
