import SwiftUI

/// Theme selection persisted in `@AppStorage`. `.system` follows the device's dark/light setting
/// (maps to Ember in dark, Parchment in light).
public enum ThemeChoice: String, CaseIterable, Identifiable, Sendable {
    case system
    case ember
    case midnight
    case parchment

    public var id: String { rawValue }

    public var displayKey: String {
        switch self {
        case .system:    return "settings.theme.system"
        case .ember:     return "settings.theme.ember"
        case .midnight:  return "settings.theme.midnight"
        case .parchment: return "settings.theme.parchment"
        }
    }
}

/// Resolved theme: palette + color scheme preference to push into SwiftUI.
public struct Theme: Equatable, Sendable {
    public let palette: Palette
    public let colorScheme: ColorScheme?  // nil = follow system

    public static let ember     = Theme(palette: .ember,     colorScheme: .dark)
    public static let midnight  = Theme(palette: .midnight,  colorScheme: .dark)
    public static let parchment = Theme(palette: .parchment, colorScheme: .light)

    public static func resolve(_ choice: ThemeChoice, systemScheme: ColorScheme) -> Theme {
        switch choice {
        case .ember:     return .ember
        case .midnight:  return .midnight
        case .parchment: return .parchment
        case .system:    return systemScheme == .dark ? .ember : .parchment
        }
    }
}

@MainActor
public final class ThemeManager: ObservableObject {
    @AppStorage("app.theme") public var choice: ThemeChoice = .ember
    @Published public var systemScheme: ColorScheme = .dark

    public init() {}

    public var current: Theme { Theme.resolve(choice, systemScheme: systemScheme) }
}

// MARK: - Environment

private struct ThemeKey: EnvironmentKey {
    static let defaultValue: Theme = .ember
}

public extension EnvironmentValues {
    var theme: Theme {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

public extension View {
    /// Apply a theme to a subtree (palette + color scheme).
    func applyTheme(_ theme: Theme) -> some View {
        self
            .environment(\.theme, theme)
            .preferredColorScheme(theme.colorScheme)
            .tint(theme.palette.accent)
            .background(theme.palette.background.ignoresSafeArea())
    }
}
