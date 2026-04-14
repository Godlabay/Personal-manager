import Foundation
import SwiftUI
import Combine
import UIKit

@MainActor
public final class FocusSessionVM: ObservableObject {
    public enum Phase: Equatable { case idle, focus, onBreak, finished }

    @Published public var durationMinutes: Int = 25
    @Published public var selectedAmbienceId: String = AmbienceCatalog.default.id
    @Published public var phase: Phase = .idle
    @Published public var remaining: TimeInterval = 0

    public var taskId: UUID?
    public var taskTitle: String?

    private var endDate: Date?
    private var timerCancellable: AnyCancellable?

    public init() {}

    public var ambience: AmbiencePreset {
        AmbienceCatalog.preset(id: selectedAmbienceId) ?? AmbienceCatalog.default
    }

    public func prefill(durationMinutes: Int?, ambienceId: String?, taskId: UUID?, taskTitle: String?) {
        if let d = durationMinutes { self.durationMinutes = max(1, min(d, 180)) }
        if let a = ambienceId, AmbienceCatalog.preset(id: a) != nil { self.selectedAmbienceId = a }
        self.taskId = taskId
        self.taskTitle = taskTitle
    }

    public func start() {
        let seconds = TimeInterval(durationMinutes * 60)
        endDate = Date().addingTimeInterval(seconds)
        remaining = seconds
        phase = .focus
        tick()
        timerCancellable = Timer.publish(every: 0.5, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in self?.tick() }
    }

    public func stop() {
        timerCancellable?.cancel()
        timerCancellable = nil
        phase = .idle
        endDate = nil
        remaining = 0
    }

    public func finish(userId: UUID, startedAt: Date) async {
        timerCancellable?.cancel()
        timerCancellable = nil
        phase = .finished
        remaining = 0
        let ambience = selectedAmbienceId == "silence" ? nil : selectedAmbienceId
        try? await TaskRepository.shared.logTimeEntry(
            taskId: taskId,
            startedAt: startedAt,
            endedAt: .now,
            ambience: ambience,
            userId: userId
        )
    }

    private func tick() {
        guard let end = endDate else { return }
        let left = end.timeIntervalSinceNow
        if left <= 0 {
            remaining = 0
            phase = .finished
            timerCancellable?.cancel()
            timerCancellable = nil
            // Fire a soft haptic + bell.
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } else {
            remaining = left
        }
    }

    public var timerString: String {
        let total = Int(max(0, remaining))
        let m = total / 60
        let s = total % 60
        return String(format: "%02d:%02d", m, s)
    }

    public var progress: Double {
        let total = Double(durationMinutes * 60)
        guard total > 0 else { return 0 }
        return 1 - (remaining / total)
    }
}
