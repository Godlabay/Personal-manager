import SwiftUI

/// Full-screen focus session sheet.
///
/// Flow:
///   1. `.idle` — user picks duration + ambience, taps Start.
///   2. `.focus` — timer ticks, ambience plays, Stop / Finish available.
///   3. `.finished` — warm confirmation + `time_entries` row is logged.
///
/// ADHD design: no guilt on abandon — "Stop" simply closes the sheet with a soft message.
public struct FocusSessionView: View {
    @StateObject private var vm = FocusSessionVM()
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    public let userId: UUID
    public let prefillTaskId: UUID?
    public let prefillTaskTitle: String?
    public let prefillDurationMinutes: Int?
    public let prefillAmbienceId: String?

    @State private var startedAt: Date?

    public init(
        userId: UUID,
        prefillTaskId: UUID? = nil,
        prefillTaskTitle: String? = nil,
        prefillDurationMinutes: Int? = nil,
        prefillAmbienceId: String? = nil
    ) {
        self.userId = userId
        self.prefillTaskId = prefillTaskId
        self.prefillTaskTitle = prefillTaskTitle
        self.prefillDurationMinutes = prefillDurationMinutes
        self.prefillAmbienceId = prefillAmbienceId
    }

    public var body: some View {
        ZStack {
            theme.palette.background.ignoresSafeArea()
            VStack(spacing: Spacing.xl) {
                header
                Spacer(minLength: Spacing.lg)
                timer
                Spacer(minLength: Spacing.lg)
                ambienceSection
                actions
            }
            .padding(.vertical, Spacing.xl)
        }
        .onAppear {
            vm.prefill(
                durationMinutes: prefillDurationMinutes,
                ambienceId: prefillAmbienceId,
                taskId: prefillTaskId,
                taskTitle: prefillTaskTitle
            )
        }
    }

    // MARK: - Pieces

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.down")
                    .font(.title3)
                    .foregroundStyle(theme.palette.textSecondary)
                    .padding(Spacing.sm)
            }
            Spacer()
            VStack(spacing: 2) {
                Text("focus.title").font(AppFont.headline()).foregroundStyle(theme.palette.text)
                if let title = vm.taskTitle {
                    Text(title).font(AppFont.caption()).foregroundStyle(theme.palette.textSecondary).lineLimit(1)
                }
            }
            Spacer()
            Color.clear.frame(width: 36, height: 36)
        }
        .padding(.horizontal, Spacing.lg)
    }

    private var timer: some View {
        ZStack {
            Circle()
                .stroke(theme.palette.surface, lineWidth: 14)
                .frame(width: 260, height: 260)

            Circle()
                .trim(from: 0, to: vm.progress)
                .stroke(
                    LinearGradient(
                        colors: [theme.palette.accentSoft, theme.palette.accent],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    style: StrokeStyle(lineWidth: 14, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .frame(width: 260, height: 260)
                .animation(.linear(duration: 0.5), value: vm.progress)

            VStack(spacing: Spacing.xs) {
                Text(vm.timerString)
                    .font(AppFont.timerDigits(64))
                    .foregroundStyle(theme.palette.text)
                Text(phaseLabel)
                    .font(AppFont.footnote(.medium))
                    .foregroundStyle(theme.palette.textSecondary)
                    .textCase(.uppercase)
                    .tracking(1.5)
            }
        }
    }

    private var phaseLabel: LocalizedStringKey {
        switch vm.phase {
        case .idle:     return "focus.phase.ready"
        case .focus:    return "focus.phase.focus"
        case .onBreak:  return "focus.phase.break"
        case .finished: return "focus.phase.done"
        }
    }

    private var ambienceSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            if vm.phase == .idle {
                durationPicker
            }
            AmbiencePicker(selectedId: $vm.selectedAmbienceId)
            if vm.phase == .focus {
                YouTubeEmbedView(preset: vm.ambience)
                    .padding(.horizontal, Spacing.lg)
            }
        }
    }

    private var durationPicker: some View {
        HStack(spacing: Spacing.sm) {
            ForEach([25, 50, 90], id: \.self) { mins in
                Button {
                    vm.durationMinutes = mins
                } label: {
                    Text("\(mins) min")
                        .font(AppFont.footnote(.semibold))
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .foregroundStyle(vm.durationMinutes == mins ? .white : theme.palette.textSecondary)
                        .background(
                            vm.durationMinutes == mins ? theme.palette.accent : theme.palette.surface,
                            in: RoundedRectangle(cornerRadius: Radius.pill, style: .continuous)
                        )
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var actions: some View {
        VStack(spacing: Spacing.md) {
            switch vm.phase {
            case .idle:
                WarmButton("focus.action.start", systemImage: "flame.fill") {
                    startedAt = .now
                    vm.start()
                }
                .padding(.horizontal, Spacing.lg)
            case .focus, .onBreak:
                WarmButton("focus.action.finish", systemImage: "checkmark.circle.fill") {
                    Task {
                        await vm.finish(userId: userId, startedAt: startedAt ?? .now)
                        dismiss()
                    }
                }
                .padding(.horizontal, Spacing.lg)
                WarmButton("focus.action.stop", systemImage: "stop.circle", style: .ghost) {
                    vm.stop()
                    dismiss()
                }
                .padding(.horizontal, Spacing.lg)
            case .finished:
                Text("focus.done.message")
                    .font(AppFont.body(.medium))
                    .foregroundStyle(theme.palette.success)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
                WarmButton("common.close", style: .secondary) { dismiss() }
                    .padding(.horizontal, Spacing.lg)
            }
        }
    }
}
