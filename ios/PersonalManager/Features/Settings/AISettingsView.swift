import SwiftUI

/// BYOK settings: pick a provider, paste the key, test the connection.
/// The key is persisted in the iOS Keychain via `APIKeyStore` — never in
/// `UserDefaults`, never logged, never sent anywhere but the chosen provider.
public struct AISettingsView: View {
    @EnvironmentObject private var registry: ProviderRegistry
    @Environment(\.theme) private var theme

    @State private var keyInput: String = ""
    @State private var isTesting: Bool = false
    @State private var testResult: String?
    @State private var showConfirmClear = false

    public init() {}

    public var body: some View {
        ZStack {
            theme.palette.background.ignoresSafeArea()
            Form {
                Section("settings.ai.provider") {
                    Picker("settings.ai.provider", selection: providerBinding) {
                        ForEach(LLMProviderKind.allCases) { kind in
                            Text(kind.displayName).tag(kind)
                        }
                    }
                    .listRowBackground(theme.palette.surface)

                    HStack {
                        Text("settings.ai.model")
                        Spacer()
                        TextField("model", text: $registry.selectedModel)
                            .multilineTextAlignment(.trailing)
                            .font(AppFont.caption().monospaced())
                            .autocorrectionDisabled()
                    }
                    .listRowBackground(theme.palette.surface)
                }

                Section("settings.ai.key") {
                    SecureField("settings.ai.key.placeholder", text: $keyInput)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .listRowBackground(theme.palette.surface)

                    Button("action.save") {
                        registry.setApiKey(keyInput.isEmpty ? nil : keyInput)
                        keyInput = ""
                        testResult = nil
                    }
                    .listRowBackground(theme.palette.surface)

                    Button {
                        Task { await test() }
                    } label: {
                        HStack {
                            if isTesting { ProgressView().controlSize(.small) }
                            Text("settings.ai.test")
                        }
                    }
                    .disabled(!registry.hasKey || isTesting)
                    .listRowBackground(theme.palette.surface)

                    if let testResult {
                        Text(testResult)
                            .font(AppFont.caption())
                            .foregroundStyle(theme.palette.textSecondary)
                            .listRowBackground(theme.palette.surface)
                    }

                    Link("ai.onboarding.getKey", destination: registry.selectedKind.getKeyURL)
                        .listRowBackground(theme.palette.surface)
                }

                Section {
                    Text("settings.ai.help")
                        .font(AppFont.caption())
                        .foregroundStyle(theme.palette.textSecondary)
                        .listRowBackground(theme.palette.surface)

                    Button(role: .destructive) {
                        showConfirmClear = true
                    } label: {
                        Text("settings.ai.clearKeys")
                    }
                    .listRowBackground(theme.palette.surface)
                }
            }
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("settings.ai.title")
        .confirmationDialog(
            "settings.ai.clearKeys.confirm",
            isPresented: $showConfirmClear,
            titleVisibility: .visible
        ) {
            Button("settings.ai.clearKeys", role: .destructive) {
                APIKeyStore.clearAll()
                registry.objectWillChange.send()
            }
            Button("action.cancel", role: .cancel) {}
        }
    }

    private var providerBinding: Binding<LLMProviderKind> {
        Binding(
            get: { registry.selectedKind },
            set: { registry.select($0) }
        )
    }

    private func test() async {
        isTesting = true; defer { isTesting = false }
        guard let key = registry.apiKey() else {
            testResult = "No key."
            return
        }
        let req = ChatRequest(
            model: registry.selectedModel,
            messages: [ChatMessage(role: .user, content: "Reply with the single word OK.")],
            tools: []
        )
        do {
            let resp = try await registry.provider().complete(req, apiKey: key)
            testResult = "✓ " + (resp.message.content?.prefix(60).description ?? "OK")
        } catch {
            testResult = "✗ " + error.localizedDescription
        }
    }
}
