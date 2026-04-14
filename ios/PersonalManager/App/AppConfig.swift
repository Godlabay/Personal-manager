import Foundation

/// Build-time config. Values come from `Info.plist` (which XcodeGen wires from env vars),
/// falling back to the local dev Supabase instance.
///
/// To override for your own project, set `SUPABASE_URL` and `SUPABASE_ANON_KEY`
/// in a `.env` file at the repo root (see `.env.example`) before running `xcodegen`.
public enum AppConfig {
    public static let supabaseURL: URL = {
        if let s = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String,
           !s.isEmpty, let url = URL(string: s) {
            return url
        }
        return URL(string: "http://127.0.0.1:54321")!
    }()

    public static let supabaseAnonKey: String = {
        if let s = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String, !s.isEmpty {
            return s
        }
        // Local Supabase default anon key (public, safe to ship in dev builds).
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    }()

    public static let authRedirectURL: URL = URL(string: "personalmanager://auth-callback")!
}
