import Foundation

/// Picks a provider implementation given the user's currently-selected kind.
/// Also exposes the preferred model and stored API key.
@MainActor
public final class ProviderRegistry: ObservableObject {
    public static let shared = ProviderRegistry()

    @Published public var selectedKind: LLMProviderKind {
        didSet { UserDefaults.standard.set(selectedKind.rawValue, forKey: "ai.provider") }
    }

    @Published public var selectedModel: String {
        didSet { UserDefaults.standard.set(selectedModel, forKey: "ai.model.\(selectedKind.rawValue)") }
    }

    private init() {
        let rawKind = UserDefaults.standard.string(forKey: "ai.provider") ?? LLMProviderKind.openai.rawValue
        let kind = LLMProviderKind(rawValue: rawKind) ?? .openai
        self.selectedKind = kind
        self.selectedModel = UserDefaults.standard.string(forKey: "ai.model.\(kind.rawValue)") ?? kind.defaultModel
    }

    public func provider() -> LLMProvider {
        switch selectedKind {
        case .openai:    return OpenAIProvider()
        case .anthropic: return AnthropicProvider()
        case .gemini, .groq:
            // Phase 1 covers OpenAI + Anthropic. Gemini/Groq arrive in Phase 1.5.
            return OpenAIProvider()
        }
    }

    public func apiKey() -> String? {
        APIKeyStore.get(for: selectedKind)
    }

    public func setApiKey(_ key: String?) {
        try? APIKeyStore.set(key, for: selectedKind)
        objectWillChange.send()
    }

    public var hasKey: Bool { apiKey()?.isEmpty == false }

    /// Update the selected provider; model defaults to that provider's default.
    public func select(_ kind: LLMProviderKind) {
        selectedKind = kind
        selectedModel = UserDefaults.standard.string(forKey: "ai.model.\(kind.rawValue)") ?? kind.defaultModel
    }
}
