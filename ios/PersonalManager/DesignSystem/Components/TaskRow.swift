import SwiftUI

/// Compact, tappable row for a task in lists (Inbox / Today / Upcoming / Project).
public struct TaskRow: View {
    public let title: String
    public let priority: Int
    public let dueLabel: String?
    public let projectName: String?
    public let labels: [String]
    public let isDone: Bool
    public let onToggle: () -> Void
    public let onFocus: () -> Void

    @Environment(\.theme) private var theme

    public init(
        title: String,
        priority: Int,
        dueLabel: String?,
        projectName: String?,
        labels: [String],
        isDone: Bool,
        onToggle: @escaping () -> Void,
        onFocus: @escaping () -> Void
    ) {
        self.title = title
        self.priority = priority
        self.dueLabel = dueLabel
        self.projectName = projectName
        self.labels = labels
        self.isDone = isDone
        self.onToggle = onToggle
        self.onFocus = onFocus
    }

    public var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Button(action: onToggle) {
                Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isDone ? theme.palette.success : Palette.priorityColors[max(0, min(3, priority - 1))])
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(title)
                    .font(AppFont.body(isDone ? .regular : .medium))
                    .foregroundStyle(isDone ? theme.palette.textMuted : theme.palette.text)
                    .strikethrough(isDone, color: theme.palette.textMuted)
                    .lineLimit(3)

                HStack(spacing: Spacing.sm) {
                    if let dueLabel {
                        HStack(spacing: 3) {
                            Image(systemName: "calendar")
                            Text(dueLabel)
                        }
                        .font(AppFont.caption(.medium))
                        .foregroundStyle(theme.palette.textSecondary)
                    }
                    if let projectName {
                        HStack(spacing: 3) {
                            Image(systemName: "folder")
                            Text(projectName)
                        }
                        .font(AppFont.caption(.medium))
                        .foregroundStyle(theme.palette.textSecondary)
                    }
                    ForEach(labels, id: \.self) { l in
                        Chip("#\(l)")
                    }
                }
            }

            Spacer(minLength: 0)

            Button(action: onFocus) {
                Image(systemName: "flame.fill")
                    .foregroundStyle(theme.palette.accent)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("action.startFocus")
        }
        .padding(Spacing.md)
        .background(theme.palette.surface, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
    }
}
