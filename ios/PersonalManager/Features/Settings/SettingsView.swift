import SwiftUI

public struct SettingsView: View {
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var themeManager: ThemeManager
    @Environment(\.theme) private var theme

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                theme.palette.background.ignoresSafeArea()
                Form {
                    Section("settings.theme") {
                        Picker("settings.theme", selection: $themeManager.choice) {
                            ForEach(ThemeChoice.allCases) { choice in
                                Text(LocalizedStringKey(choice.displayKey)).tag(choice)
                            }
                        }
                        .pickerStyle(.segmented)
                        .listRowBackground(theme.palette.surface)
                    }

                    Section("settings.ai.title") {
                        NavigationLink("settings.ai.manage") {
                            AISettingsView()
                        }
                        .listRowBackground(theme.palette.surface)
                    }

                    Section("settings.account") {
                        if let email = auth.user?.email {
                            HStack {
                                Text("settings.account.signedIn")
                                Spacer()
                                Text(email).foregroundStyle(theme.palette.textSecondary)
                            }
                            .listRowBackground(theme.palette.surface)
                        }
                        Button(role: .destructive) {
                            Task { await auth.signOut() }
                        } label: {
                            Text("settings.account.signOut")
                        }
                        .listRowBackground(theme.palette.surface)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("settings.title")
        }
    }
}
