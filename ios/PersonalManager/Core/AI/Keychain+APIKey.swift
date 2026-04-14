import Foundation
import Security

/// Stores BYOK API keys in the iOS Keychain, scoped per-provider.
public enum APIKeyStore {
    private static let service = "app.personalmanager.llm-keys"

    public static func set(_ key: String?, for provider: LLMProviderKind) throws {
        let account = provider.rawValue
        // Remove previous
        let base: [String: Any] = [
            kSecClass as String:        kSecClassGenericPassword,
            kSecAttrService as String:  service,
            kSecAttrAccount as String:  account
        ]
        SecItemDelete(base as CFDictionary)

        guard let key, !key.isEmpty else { return }

        var add = base
        add[kSecValueData as String] = Data(key.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

        let status = SecItemAdd(add as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw NSError(domain: "APIKeyStore", code: Int(status))
        }
    }

    public static func get(for provider: LLMProviderKind) -> String? {
        let query: [String: Any] = [
            kSecClass as String:        kSecClassGenericPassword,
            kSecAttrService as String:  service,
            kSecAttrAccount as String:  provider.rawValue,
            kSecReturnData as String:   true,
            kSecMatchLimit as String:   kSecMatchLimitOne
        ]
        var out: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data,
              let s = String(data: data, encoding: .utf8) else { return nil }
        return s
    }

    public static func clearAll() {
        for p in LLMProviderKind.allCases {
            let q: [String: Any] = [
                kSecClass as String:       kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: p.rawValue
            ]
            SecItemDelete(q as CFDictionary)
        }
    }
}
