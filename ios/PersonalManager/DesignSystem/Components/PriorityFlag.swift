import SwiftUI

public struct PriorityFlag: View {
    public let priority: Int   // 1..4
    public var size: CGFloat = 14

    public init(priority: Int, size: CGFloat = 14) {
        self.priority = priority
        self.size = size
    }

    public var body: some View {
        let index = max(0, min(3, priority - 1))
        let color = Palette.priorityColors[index]
        return Image(systemName: priority == 1 ? "flag" : "flag.fill")
            .font(.system(size: size, weight: .semibold))
            .foregroundStyle(priority == 1 ? color.opacity(0.5) : color)
            .accessibilityLabel("P\(priority)")
    }
}
