import Foundation
import Supabase

/// Shared Supabase client. One instance for the whole app.
///
/// `supabase-swift` caches sessions in its own Keychain entries, so
/// signing out on one device only affects that device.
public enum SupabaseService {
    public static let shared: SupabaseClient = SupabaseClient(
        supabaseURL: AppConfig.supabaseURL,
        supabaseKey: AppConfig.supabaseAnonKey,
        options: SupabaseClientOptions(
            db: .init(schema: "public"),
            auth: .init(
                storage: KeychainLocalStorage(service: "app.personalmanager.supabase-auth"),
                flowType: .pkce
            )
        )
    )
}
