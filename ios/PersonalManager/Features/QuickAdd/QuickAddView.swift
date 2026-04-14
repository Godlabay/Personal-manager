import SwiftUI
import Supabase

/// Quick-add sheet: user types "Appeler le dentiste demain 10h" and the parser
/// pulls out title, date, and time. No friction, no extra fields.
public struct QuickAddView: View {
    @EnvironmentObject private var auth: AuthService
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var text: String
    @State private var priority: Int = 1
    @State private var parsed: FrenchEnglishDateParser.Result?
    @State private var isSaving = false
    @State private var error: String?

    @FocusState private var fieldFocused: Bool

    private let parser = FrenchEnglishDateParser()

    public init(initialText: String = "") {
        _text = State(initialValue: initialText)
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                theme.palette.background.ignoresSafeArea()
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    TextField("quickadd.placeholder", text: $text, axis: .vertical)
                        .font(AppFont.title3())
                        .textInputAutocapitalization(.sentences)
                        .focused($fieldFocused)
                        .onChange(of: text) { _, new in parsed = parser.parse(new) }
                        .padding(Spacing.md)
                        .background(theme.palette.surface, in: RoundedRectangle(cornerRadius: Radius.card))

                    if let p = parsed {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "calendar")
                            Text(Self.formatDue(p.date, hasTime: p.hasTime))
                        }
                        .font(AppFont.footnote(.medium))
                        .foregroundStyle(theme.palette.accent)
                    }

                    HStack(spacing: Spacing.sm) {
                        ForEach(1...4, id: \.self) { p in
                            Button { priority = p } label: {
                                PriorityFlag(priority: p, size: 18)
                                    .padding(Spacing.sm)
                                    .background(
                                        priority == p
                                            ? theme.palette.accent.opacity(0.2)
                                            : Color.clear,
                                        in: Circle()
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                        Spacer()
                    }

                    if let error {
                        Text(error).font(AppFont.caption()).foregroundStyle(theme.palette.danger)
                    }

                    Spacer()

                    WarmButton("action.add", systemImage: "plus.circle.fill") {
                        Task { await save() }
                    }
                    .disabled(cleanTitle.isEmpty || isSaving)
                    .opacity(cleanTitle.isEmpty || isSaving ? 0.5 : 1)
                }
                .padding(Spacing.lg)
            }
            .navigationTitle("quickadd.title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("action.cancel") { dismiss() }
                }
            }
            .onAppear {
                fieldFocused = true
                if !text.isEmpty { parsed = parser.parse(text) }
            }
        }
    }

    private var cleanTitle: String {
        (parsed?.remaining ?? text).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func save() async {
        guard let userId = auth.user?.id else { return }
        isSaving = true; defer { isSaving = false }
        do {
            let dto = TaskDTO(
                id: UUID(),
                userId: userId,
                projectId: nil,
                sectionId: nil,
                parentTaskId: nil,
                title: cleanTitle,
                description: nil,
                priority: priority,
                dueAt: parsed?.date,
                dueHasTime: parsed?.hasTime ?? false,
                recurrenceRrule: nil,
                status: "open",
                kanbanColumn: nil,
                estimatedMinutes: nil,
                energyLevel: nil,
                sortOrder: 0,
                completedAt: nil,
                createdAt: .now,
                updatedAt: .now
            )
            _ = try await TaskRepository.shared.createTask(dto)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private static func formatDue(_ date: Date, hasTime: Bool) -> String {
        let f = DateFormatter()
        f.dateStyle = .full
        f.timeStyle = hasTime ? .short : .none
        return f.string(from: date)
    }
}
