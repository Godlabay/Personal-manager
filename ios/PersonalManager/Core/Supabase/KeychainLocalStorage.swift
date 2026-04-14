import Foundation
import Supabase
import Security

/// Conforms to supabase-swift's `AuthLocalStorage` and stores items in the iOS Keychain.
public final class KeychainLocalStorage: AuthLocalStorage {
    private let service: String

    public init(service: String) {
        self.service = service
    }

    public func store(key: String, value: Data) throws {
        var query = baseQuery(for: key)
        SecItemDelete(query as CFDictionary)

        query[kSecValueData as String] = value
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            throw KeychainError(status: status)
        }
    }

    public func retrieve(key: String) throws -> Data? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        if status == errSecItemNotFound { return nil }
        if status != errSecSuccess { throw KeychainError(status: status) }
        return item as? Data
    }

    public func remove(key: String) throws {
        let query = baseQuery(for: key)
        let status = SecItemDelete(query as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound {
            throw KeychainError(status: status)
        }
    }

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String:          kSecClassGenericPassword,
            kSecAttrService as String:    service,
            kSecAttrAccount as String:    key
        ]
    }
}

public struct KeychainError: Error {
    public let status: OSStatus
}
