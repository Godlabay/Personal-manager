import SwiftUI

public enum WarmButtonStyle {
    case primary
    case secondary
    case ghost
    case destructive
}

public struct WarmButton: View {
    public let title: String
    public var systemImage: String?
    public var style: WarmButtonStyle = .primary
    public let action: () -> Void

    @Environment(\.theme) private var theme

    public init(_ title: String, systemImage: String? = nil, style: WarmButtonStyle = .primary, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.style = style
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if let systemImage { Image(systemName: systemImage) }
                Text(title).font(AppFont.headline())
            }
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(foreground)
            .background(background, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                    .stroke(border, lineWidth: borderWidth)
            )
        }
        .buttonStyle(.plain)
    }

    private var foreground: Color {
        switch style {
        case .primary:     return .white
        case .secondary:   return theme.palette.text
        case .ghost:       return theme.palette.accent
        case .destructive: return .white
        }
    }
    private var background: Color {
        switch style {
        case .primary:     return theme.palette.accent
        case .secondary:   return theme.palette.surfaceElevated
        case .ghost:       return .clear
        case .destructive: return theme.palette.danger
        }
    }
    private var border: Color {
        switch style {
        case .ghost: return theme.palette.accent.opacity(0.6)
        default:     return .clear
        }
    }
    private var borderWidth: CGFloat {
        style == .ghost ? 1.5 : 0
    }
}
