import SwiftUI
import YouTubePlayerKit

/// Compact, rounded YouTube player for an ambience preset.
///
/// Autoplays, loops, and exposes a small overlay to pause/resume without leaving the session.
/// When `preset.youtubeId` is nil (the "silence" preset), nothing plays.
///
/// Limitation: the YouTube iframe player requires the app to stay foregrounded to keep audio alive.
/// We document this in Settings and plan to ship bundled royalty-free packs in Phase 2.
public struct YouTubeEmbedView: View {
    public let preset: AmbiencePreset
    public var isMuted: Bool = false

    @Environment(\.theme) private var theme
    @StateObject private var player: YouTubePlayer

    public init(preset: AmbiencePreset, isMuted: Bool = false) {
        self.preset = preset
        self.isMuted = isMuted
        let source: YouTubePlayer.Source? = preset.youtubeId.map { .video(id: $0) }
        let config = YouTubePlayer.Configuration(
            autoPlay: true,
            loopEnabled: true,
            showControls: false,
            showRelatedVideos: false,
            showFullscreenButton: false,
            playInline: true
        )
        _player = StateObject(wrappedValue: YouTubePlayer(source: source, configuration: config))
    }

    public var body: some View {
        VStack(spacing: 0) {
            if preset.youtubeId != nil {
                YouTubePlayerView(player) { state in
                    switch state {
                    case .idle:
                        placeholder(.idle)
                    case .ready:
                        EmptyView()
                    case .error:
                        placeholder(.error)
                    }
                }
                .aspectRatio(16/9, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                .onAppear { Task { try? await player.setVolume(isMuted ? 0 : 60) } }
                .onChange(of: isMuted) { _, muted in
                    Task { try? await player.setVolume(muted ? 0 : 60) }
                }
                .onChange(of: preset.id) { _, _ in
                    if let id = preset.youtubeId {
                        Task { try? await player.load(source: .video(id: id)) }
                    }
                }
            } else {
                silenceCard
            }
        }
    }

    private var silenceCard: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: preset.sfSymbol)
                .font(.title2)
                .foregroundStyle(theme.palette.textSecondary)
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(preset.title).font(AppFont.headline())
                Text(preset.subtitle).font(AppFont.caption()).foregroundStyle(theme.palette.textSecondary)
            }
            Spacer()
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(theme.palette.surface, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
    }

    private enum Stage { case idle, error }

    @ViewBuilder
    private func placeholder(_ stage: Stage) -> some View {
        ZStack {
            theme.palette.surface
            VStack(spacing: Spacing.sm) {
                Image(systemName: stage == .error ? "wifi.exclamationmark" : preset.sfSymbol)
                    .font(.system(size: 28))
                    .foregroundStyle(theme.palette.accent)
                Text(stage == .error
                     ? "focus.ambience.loadFailed"
                     : "focus.ambience.loading")
                    .font(AppFont.caption())
                    .foregroundStyle(theme.palette.textSecondary)
            }
        }
    }
}
