import SwiftUI

public struct EmptyState: View {
    public let systemImage: String
    public let title: LocalizedStringKey
    public let subtitle: LocalizedStringKey?

    @Environment(\.theme) private var theme

    public init(systemImage: String, title: LocalizedStringKey, subtitle: LocalizedStringKey? = nil) {
        self.systemImage = systemImage
        self.title = title
        self.subtitle = subtitle
    }

    public var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: systemImage)
                .font(.system(size: 42, weight: .regular))
                .foregroundStyle(theme.palette.accent.opacity(0.7))
            Text(title)
                .font(AppFont.title2())
                .foregroundStyle(theme.palette.text)
                .multilineTextAlignment(.center)
            if let subtitle {
                Text(subtitle)
                    .font(AppFont.callout())
                    .foregroundStyle(theme.palette.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(Spacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
