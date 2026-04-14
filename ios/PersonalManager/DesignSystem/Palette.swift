import SwiftUI

/// Warm, cocoon-style palettes. Three variants; user picks in Settings.
///
/// Color science notes:
/// - Ember is the default. Background trends chocolate-noir, accent is ember orange.
/// - Midnight is for users who find Ember too saturated at night. Still slightly warm.
/// - Parchment is the light theme; background is paper-ivory, not cold white.
public struct Palette: Equatable, Sendable {
    public let background: Color
    public let surface: Color
    public let surfaceElevated: Color
    public let accent: Color
    public let accentSoft: Color
    public let text: Color
    public let textSecondary: Color
    public let textMuted: Color
    public let success: Color
    public let warning: Color
    public let danger: Color
    public let outline: Color

    public static let ember = Palette(
        background:      Color(hex: 0x1E1612),
        surface:         Color(hex: 0x2A1F18),
        surfaceElevated: Color(hex: 0x3A2A20),
        accent:          Color(hex: 0xFF8A3D),
        accentSoft:      Color(hex: 0xFFB86B),
        text:            Color(hex: 0xF5E6D3),
        textSecondary:   Color(hex: 0xC9B89E),
        textMuted:       Color(hex: 0x8A7A66),
        success:         Color(hex: 0x7FA84E),
        warning:         Color(hex: 0xE0A955),
        danger:          Color(hex: 0xC94E3B),
        outline:         Color(hex: 0x4A3A2E)
    )

    public static let midnight = Palette(
        background:      Color(hex: 0x0F141A),
        surface:         Color(hex: 0x141B24),
        surfaceElevated: Color(hex: 0x1C2530),
        accent:          Color(hex: 0x7FA2E0),
        accentSoft:      Color(hex: 0xA9C1EB),
        text:            Color(hex: 0xE6EAF2),
        textSecondary:   Color(hex: 0xABB5C7),
        textMuted:       Color(hex: 0x6B7585),
        success:         Color(hex: 0x86B472),
        warning:         Color(hex: 0xD9A866),
        danger:          Color(hex: 0xD16B5A),
        outline:         Color(hex: 0x2A3444)
    )

    public static let parchment = Palette(
        background:      Color(hex: 0xFAF3E6),
        surface:         Color(hex: 0xFFFFFF),
        surfaceElevated: Color(hex: 0xFFF9EC),
        accent:          Color(hex: 0xC6581D),
        accentSoft:      Color(hex: 0xE88A52),
        text:            Color(hex: 0x2A1F18),
        textSecondary:   Color(hex: 0x5B4B3D),
        textMuted:       Color(hex: 0x8C7E6E),
        success:         Color(hex: 0x5A7F33),
        warning:         Color(hex: 0xB77A2B),
        danger:          Color(hex: 0xA63A28),
        outline:         Color(hex: 0xE4D8C3)
    )

    /// Priority chip colours (P1..P4). Independent of theme accent to keep meaning stable.
    public static let priorityColors: [Color] = [
        Color(hex: 0x7C8A94), // P1 low — slate
        Color(hex: 0x5BA4E0), // P2 medium — blue
        Color(hex: 0xE0A955), // P3 high — amber
        Color(hex: 0xC94E3B)  // P4 urgent — terracotta
    ]
}

// MARK: - Color hex helper

public extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}
