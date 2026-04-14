import Foundation

public struct AmbiencePreset: Identifiable, Sendable, Equatable {
    public let id: String           // stable id used by the agent tool
    public let title: String
    public let subtitle: String
    public let youtubeId: String?   // nil = silence
    public let sfSymbol: String     // artwork placeholder until we ship real art

    public init(id: String, title: String, subtitle: String, youtubeId: String?, sfSymbol: String) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.youtubeId = youtubeId
        self.sfSymbol = sfSymbol
    }
}

public enum AmbienceCatalog {
    /// Curated LOTR-leaning lo-fi presets. YouTube IDs are examples — swap to your preferred
    /// videos if any get taken down. The player uses the iframe API so there's no scraping.
    public static let all: [AmbiencePreset] = [
        AmbiencePreset(
            id: "rohan-lofi",
            title: "Rohan lofi",
            subtitle: "Rolling plains, quiet hooves",
            youtubeId: "HCApfuJXs38",
            sfSymbol: "wind"
        ),
        AmbiencePreset(
            id: "shire-rain",
            title: "Shire rainy day",
            subtitle: "Soft rain on Bag End",
            youtubeId: "M2KQQDhEKGc",
            sfSymbol: "cloud.rain.fill"
        ),
        AmbiencePreset(
            id: "rivendell-piano",
            title: "Rivendell piano",
            subtitle: "Elvish melancholy",
            youtubeId: "gcgjH6Ze8rs",
            sfSymbol: "music.note"
        ),
        AmbiencePreset(
            id: "fangorn-forest",
            title: "Forest of Fangorn",
            subtitle: "Ancient trees breathing",
            youtubeId: "xNN7iTA57jM",
            sfSymbol: "leaf.fill"
        ),
        AmbiencePreset(
            id: "mordor-dark",
            title: "Mordor dark ambient",
            subtitle: "For the deep focus",
            youtubeId: "CjaY49bktVs",
            sfSymbol: "flame.fill"
        ),
        AmbiencePreset(
            id: "silence",
            title: "Silence",
            subtitle: "No ambience",
            youtubeId: nil,
            sfSymbol: "speaker.slash.fill"
        )
    ]

    public static func preset(id: String?) -> AmbiencePreset? {
        guard let id else { return nil }
        return all.first { $0.id == id }
    }

    public static var `default`: AmbiencePreset { all[0] }
}
