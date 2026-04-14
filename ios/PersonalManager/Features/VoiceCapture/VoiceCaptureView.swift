import SwiftUI
import Speech
import AVFoundation

/// Hold-to-speak capture sheet. Uses `SFSpeechRecognizer` with on-device recognition
/// preferred (iOS 17+). On release, the transcript drops into `QuickAddView` via the
/// `onTranscribed` callback.
///
/// Privacy note: we never stream audio to a server. `requiresOnDeviceRecognition = true`
/// is forced when available.
public struct VoiceCaptureView: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm = VoiceCaptureVM()

    public let onTranscribed: (String) -> Void

    public init(onTranscribed: @escaping (String) -> Void) {
        self.onTranscribed = onTranscribed
    }

    public var body: some View {
        ZStack {
            theme.palette.background.ignoresSafeArea()
            VStack(spacing: Spacing.xl) {
                Spacer()

                Text(vm.transcript.isEmpty ? "quickadd.voice.hint" : LocalizedStringKey(vm.transcript))
                    .font(AppFont.title2())
                    .foregroundStyle(theme.palette.text)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)

                Spacer()

                pulseButton

                if let err = vm.errorMessage {
                    Text(err).font(AppFont.caption()).foregroundStyle(theme.palette.danger)
                }

                WarmButton("action.done", style: .secondary) {
                    if !vm.transcript.isEmpty { onTranscribed(vm.transcript) }
                    dismiss()
                }
                .padding(.horizontal, Spacing.lg)
            }
            .padding(.vertical, Spacing.xl)
        }
        .task { await vm.requestPermissions() }
    }

    private var pulseButton: some View {
        Button {} label: {
            ZStack {
                Circle()
                    .fill(theme.palette.accent.opacity(vm.isRecording ? 0.35 : 0.2))
                    .frame(width: vm.isRecording ? 180 : 140, height: vm.isRecording ? 180 : 140)
                    .animation(.easeInOut(duration: 0.3), value: vm.isRecording)
                Circle()
                    .fill(theme.palette.accent)
                    .frame(width: 112, height: 112)
                Image(systemName: "mic.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(.white)
            }
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    if !vm.isRecording { Task { await vm.start() } }
                }
                .onEnded { _ in
                    vm.stop()
                }
        )
    }
}

@MainActor
public final class VoiceCaptureVM: ObservableObject {
    @Published public private(set) var transcript: String = ""
    @Published public private(set) var isRecording: Bool = false
    @Published public private(set) var errorMessage: String?

    private let audioEngine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?

    public init() {
        self.recognizer = SFSpeechRecognizer(locale: Locale.current)
            ?? SFSpeechRecognizer(locale: Locale(identifier: "en_US"))
    }

    public func requestPermissions() async {
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            SFSpeechRecognizer.requestAuthorization { _ in cont.resume() }
        }
        await AVAudioApplication.requestRecordPermission()
    }

    public func start() async {
        guard !isRecording, let recognizer, recognizer.isAvailable else {
            errorMessage = "Speech recognition unavailable."
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            errorMessage = error.localizedDescription
            return
        }

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        if #available(iOS 17.0, *) {
            req.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        }
        request = req

        let input = audioEngine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            req.append(buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            errorMessage = error.localizedDescription
            return
        }

        transcript = ""
        isRecording = true
        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            Task { @MainActor in
                guard let self else { return }
                if let result {
                    self.transcript = result.bestTranscription.formattedString
                }
                if error != nil || (result?.isFinal ?? false) {
                    self.stop()
                }
            }
        }
    }

    public func stop() {
        guard isRecording else { return }
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.finish()
        task = nil
        request = nil
        isRecording = false
    }
}
