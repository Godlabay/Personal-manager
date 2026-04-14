import SwiftUI

/// Agent chat panel. Renders the conversation, shows tool-call bubbles compactly,
/// and presents a text composer at the bottom.
/// Tapping a task flame / asking "focus 25 min sur ..." triggers a `FocusSessionView`.
public struct AIChatView: View {
    @EnvironmentObject private var auth: AuthService
    @Environment(\.theme) private var theme
    @Environment(\.locale) private var locale

    @StateObject private var vm: AIChatVM
    @State private var focusReq: FocusStartRequest?

    public init(systemPrompt: String) {
        _vm = StateObject(wrappedValue: AIChatVM(systemPrompt: systemPrompt))
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                theme.palette.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    messageList
                    composer
                }
            }
            .navigationTitle("tab.ai")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { vm.reset() } label: {
                        Image(systemName: "arrow.counterclockwise")
                    }
                }
            }
            .onChange(of: vm.pendingFocus?.durationMinutes) { _, _ in
                if let req = vm.pendingFocus {
                    focusReq = req
                    vm.pendingFocus = nil
                }
            }
            .fullScreenCover(item: Binding(
                get: { focusReq.map { IdentifiedRequest(value: $0) } },
                set: { focusReq = $0?.value }
            )) { idf in
                if let userId = auth.user?.id {
                    FocusSessionView(
                        userId: userId,
                        prefillTaskId: idf.value.taskId,
                        prefillDurationMinutes: idf.value.durationMinutes,
                        prefillAmbienceId: idf.value.ambienceId
                    )
                }
            }
        }
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Spacing.md) {
                    if vm.messages.filter({ $0.role != .system }).isEmpty {
                        EmptyState(
                            systemImage: "sparkles",
                            title: "agent.greeting",
                            subtitle: nil
                        )
                        .padding(.top, Spacing.xxl)
                    }
                    ForEach(Array(vm.messages.enumerated()), id: \.offset) { i, msg in
                        bubble(for: msg).id(i)
                    }
                    if vm.isThinking {
                        HStack(spacing: Spacing.sm) {
                            ProgressView().controlSize(.small)
                            Text("agent.thinking").font(AppFont.caption())
                                .foregroundStyle(theme.palette.textSecondary)
                        }
                        .padding(Spacing.md)
                    }
                    if let error = vm.lastError {
                        Text(error)
                            .font(AppFont.caption())
                            .foregroundStyle(theme.palette.danger)
                            .padding(Spacing.md)
                    }
                }
                .padding(Spacing.lg)
            }
            .onChange(of: vm.messages.count) { _, newCount in
                withAnimation { proxy.scrollTo(newCount - 1, anchor: .bottom) }
            }
        }
    }

    @ViewBuilder
    private func bubble(for msg: ChatMessage) -> some View {
        switch msg.role {
        case .system:
            EmptyView()
        case .user:
            HStack {
                Spacer(minLength: Spacing.xxl)
                Text(msg.content ?? "")
                    .padding(Spacing.md)
                    .foregroundStyle(.white)
                    .background(theme.palette.accent, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
            }
        case .assistant:
            if let content = msg.content, !content.isEmpty {
                HStack {
                    Text(content)
                        .padding(Spacing.md)
                        .foregroundStyle(theme.palette.text)
                        .background(theme.palette.surface, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                    Spacer(minLength: Spacing.xxl)
                }
            }
            if let calls = msg.toolCalls {
                ForEach(calls) { call in
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "wrench.and.screwdriver")
                        Text(call.name)
                    }
                    .font(AppFont.caption(.medium))
                    .foregroundStyle(theme.palette.textSecondary)
                }
            }
        case .tool:
            HStack {
                Text(msg.content ?? "")
                    .font(AppFont.caption())
                    .padding(Spacing.sm)
                    .foregroundStyle(theme.palette.textSecondary)
                    .background(theme.palette.surface.opacity(0.6), in: RoundedRectangle(cornerRadius: Radius.chip))
                Spacer(minLength: Spacing.xxl)
            }
        }
    }

    private var composer: some View {
        HStack(spacing: Spacing.sm) {
            TextField("agent.compose.placeholder", text: $vm.input, axis: .vertical)
                .padding(Spacing.md)
                .background(theme.palette.surface, in: RoundedRectangle(cornerRadius: Radius.card))
                .lineLimit(1...4)

            Button {
                Task {
                    let lang = (locale.language.languageCode?.identifier == "fr") ? "fr" : "en"
                    if let uid = auth.user?.id {
                        await vm.send(userId: uid, locale: lang)
                    }
                }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.largeTitle)
                    .foregroundStyle(theme.palette.accent)
            }
            .disabled(vm.isThinking || vm.input.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(Spacing.md)
    }
}

/// Wraps `FocusStartRequest` for use with `fullScreenCover(item:)`.
private struct IdentifiedRequest: Identifiable {
    let id = UUID()
    let value: FocusStartRequest
}
