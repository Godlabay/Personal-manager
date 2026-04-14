import SwiftUI

/// Horizontal carousel of ambience presets.
///
/// Shows the curated LOTR lo-fi tiles (Rohan, Shire, Rivendell, Fangorn, Mordor) + silence.
/// Tapping a tile writes the selected id back to the binding.
public struct AmbiencePicker: View {
    @Binding public var selectedId: String
    public let presets: [AmbiencePreset]

    @Environment(\.theme) private var theme

    public init(selectedId: Binding<String>, presets: [AmbiencePreset] = AmbienceCatalog.all) {
        self._selectedId = selectedId
        self.presets = presets
    }

    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.md) {
                ForEach(presets) { preset in
                    tile(preset)
                        .onTapGesture { withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            selectedId = preset.id
                        } }
                }
            }
            .padding(.horizontal, Spacing.lg)
        }
    }

    @ViewBuilder
    private func tile(_ preset: AmbiencePreset) -> some View {
        let isSelected = preset.id == selectedId
        VStack(alignment: .leading, spacing: Spacing.sm) {
            ZStack {
                RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                    .fill(isSelected ? theme.palette.accent.opacity(0.25) : theme.palette.surface)
                Image(systemName: preset.sfSymbol)
                    .font(.system(size: 36, weight: .regular))
                    .foregroundStyle(isSelected ? theme.palette.accent : theme.palette.textSecondary)
            }
            .frame(width: 120, height: 84)
            .overlay(
                RoundedRectangle(cornerRadius: Radius.card, style: .continuous)
                    .stroke(isSelected ? theme.palette.accent : .clear, lineWidth: 2)
            )

            Text(preset.title)
                .font(AppFont.footnote(.semibold))
                .foregroundStyle(isSelected ? theme.palette.text : theme.palette.textSecondary)
                .lineLimit(1)
            Text(preset.subtitle)
                .font(AppFont.caption())
                .foregroundStyle(theme.palette.textMuted)
                .lineLimit(1)
        }
        .frame(width: 120, alignment: .leading)
    }
}
