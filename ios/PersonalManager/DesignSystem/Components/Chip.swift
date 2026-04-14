import SwiftUI

public struct Chip: View {
    public let text: String
    public var color: Color?
    public var systemImage: String?

    @Environment(\.theme) private var theme

    public init(_ text: String, color: Color? = nil, systemImage: String? = nil) {
        self.text = text
        self.color = color
        self.systemImage = systemImage
    }

    public var body: some View {
        HStack(spacing: Spacing.xs) {
            if let systemImage { Image(systemName: systemImage) }
            Text(text)
        }
        .font(AppFont.caption(.medium))
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, 3)
        .foregroundStyle(chipForeground)
        .background(chipBackground, in: RoundedRectangle(cornerRadius: Radius.chip, style: .continuous))
    }

    private var chipBackground: Color {
        (color ?? theme.palette.accent).opacity(0.18)
    }

    private var chipForeground: Color {
        color ?? theme.palette.accent
    }
}
