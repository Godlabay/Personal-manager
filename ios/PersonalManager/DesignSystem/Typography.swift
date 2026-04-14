import SwiftUI

/// SF Rounded — chosen for a softer, less clinical feel than SF Pro.
/// All type tokens go through these helpers so we can tune globally.
public enum AppFont {
    public static func largeTitle(_ weight: Font.Weight = .bold) -> Font {
        .system(.largeTitle, design: .rounded, weight: weight)
    }
    public static func title(_ weight: Font.Weight = .semibold) -> Font {
        .system(.title, design: .rounded, weight: weight)
    }
    public static func title2(_ weight: Font.Weight = .semibold) -> Font {
        .system(.title2, design: .rounded, weight: weight)
    }
    public static func title3(_ weight: Font.Weight = .semibold) -> Font {
        .system(.title3, design: .rounded, weight: weight)
    }
    public static func headline(_ weight: Font.Weight = .semibold) -> Font {
        .system(.headline, design: .rounded, weight: weight)
    }
    public static func body(_ weight: Font.Weight = .regular) -> Font {
        .system(.body, design: .rounded, weight: weight)
    }
    public static func callout(_ weight: Font.Weight = .regular) -> Font {
        .system(.callout, design: .rounded, weight: weight)
    }
    public static func footnote(_ weight: Font.Weight = .regular) -> Font {
        .system(.footnote, design: .rounded, weight: weight)
    }
    public static func caption(_ weight: Font.Weight = .regular) -> Font {
        .system(.caption, design: .rounded, weight: weight)
    }

    /// Monospaced digits for timers & countdowns.
    public static func timerDigits(_ size: CGFloat) -> Font {
        .system(size: size, weight: .medium, design: .rounded).monospacedDigit()
    }
}
