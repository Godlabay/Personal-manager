import SwiftUI

/// Magic-link email sign-in. One field, one button — no password.
/// After submit, the sheet shows a gentle confirmation and waits for the deep-link callback.
public struct SignInView: View {
    @EnvironmentObject private var auth: AuthService
    @Environment(\.theme) private var theme

    @State private var email: String = ""
    @State private var isSending = false
    @State private var didSend = false
    @State private var error: String?

    public init() {}

    public var body: some View {
        ZStack {
            theme.palette.background.ignoresSafeArea()
            VStack(spacing: Spacing.xl) {
                Spacer()
                Image(systemName: "flame.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(theme.palette.accent)
                Text("app.name").font(AppFont.largeTitle()).foregroundStyle(theme.palette.text)
                Text("signin.subtitle")
                    .font(AppFont.body())
                    .foregroundStyle(theme.palette.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)

                Spacer()

                if didSend {
                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "envelope.fill")
                            .font(.title)
                            .foregroundStyle(theme.palette.accent)
                        Text("signin.sent.title").font(AppFont.headline())
                        Text("signin.sent.body")
                            .font(AppFont.caption())
                            .foregroundStyle(theme.palette.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(Spacing.lg)
                    .background(theme.palette.surface, in: RoundedRectangle(cornerRadius: Radius.card))
                } else {
                    TextField("signin.email.placeholder", text: $email)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(Spacing.md)
                        .background(theme.palette.surface, in: RoundedRectangle(cornerRadius: Radius.card))

                    WarmButton("signin.send", systemImage: "paperplane.fill") {
                        Task { await send() }
                    }
                    .disabled(email.isEmpty || isSending)
                    .opacity(email.isEmpty || isSending ? 0.5 : 1)

                    if let error {
                        Text(error).font(AppFont.caption()).foregroundStyle(theme.palette.danger)
                    }
                }
                Spacer()
            }
            .padding(Spacing.xl)
        }
    }

    private func send() async {
        isSending = true; defer { isSending = false }
        do {
            try await auth.requestMagicLink(email: email)
            didSend = true
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}
