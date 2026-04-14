# Personal Manager

A warm, ADHD-friendly iOS superapp that combines Todoist-style task management, Skeltec-style project management, and an AI agent that outsources task wrangling to a Large Language Model.

- **Stack:** SwiftUI (iOS 17+) · SwiftData · Supabase (Postgres + Auth + Realtime + Storage)
- **AI:** BYOK — bring your own OpenAI / Anthropic / Gemini / Groq key. Stored in the iOS Keychain. Zero infra cost.
- **Focus:** warm UI (Ember / Midnight / Parchment themes), friction-free voice capture, Pomodoro focus sessions with lo-fi ambiances (LOTR, Shire, Rivendell…), gentle-on-overdue design.

## Repo layout

```
├── ios/                       SwiftUI iOS app (XcodeGen-managed project)
│   ├── project.yml            Run `xcodegen generate` here
│   └── PersonalManager/       App source
│       ├── App/               Entry point, routing
│       ├── Features/          Inbox, Today, Upcoming, Projects, AIChat, FocusSession, Settings
│       ├── Core/              Supabase, AI, Models, Sync, NLP, Notifications, Focus
│       ├── DesignSystem/      Theme, Palette, Typography, Components
│       └── Resources/         Localizable.strings (en, fr), assets
├── supabase/
│   ├── config.toml            Local Supabase config
│   └── migrations/            0001_init.sql, 0002_rls.sql
├── prompts/
│   ├── system.md              ADHD-aware bilingual agent persona
│   └── break_down_task.md     Sub-prompt for break-down tool
└── docs/
    ├── architecture.md
    └── data-model.md
```

## Getting started

### Prerequisites

- Xcode 15.4+ with iOS 17 SDK
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `brew install supabase/tap/supabase`
- A free Supabase project (cloud or local via `supabase start`)
- *(Optional but recommended)* an OpenAI API key to try the AI features

### 1. Supabase

```bash
cp .env.example .env
# Fill SUPABASE_URL / SUPABASE_ANON_KEY from your project

# Local dev (optional)
supabase start
supabase db reset    # applies migrations/

# Or push to your cloud project
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 2. Generate the Xcode project

```bash
cd ios
xcodegen generate
open PersonalManager.xcodeproj
```

The first build will resolve the Swift Package dependencies (`supabase-swift`, `YouTubePlayerKit`).

### 3. Configure the app

1. In Xcode, select the `PersonalManager` target → **Signing & Capabilities** → set your Team.
2. Edit `ios/PersonalManager/App/AppConfig.swift` or rely on the `.env` values baked in at build time via XcodeGen (see `ios/project.yml`).
3. Build & run on an iPhone 14+ simulator.

### 4. First launch

- Sign in via Supabase magic link.
- **Settings → AI** → paste your OpenAI key. Test connection. Done.
- Try: long-press the tab bar → say "acheter du pain demain 10h et appeler le dentiste".

## Phase 1 scope

✅ Inbox · Today · Upcoming · Projects (list) · Subtasks · Priorities · Labels
✅ Natural-language quick-add (FR + EN)
✅ AI chat panel with 6 tools (create, break_down, reschedule, defer, daily_brief, start_focus)
✅ Voice capture via SFSpeechRecognizer → agent routing
✅ Focus Sessions (Pomodoro + YouTube lo-fi ambiances, LOTR presets)
✅ Local notifications for time reminders
✅ Offline-first (SwiftData cache + outbox)
✅ Three warm themes (Ember default, Midnight, Parchment)

See [`docs/architecture.md`](./docs/architecture.md) for the full design.

## Roadmap

- **Phase 2:** Kanban, RRULE recurrences, EventKit sync, location reminders, saved filters, Karma UI, calendar view, background-safe lo-fi, Spotify/Apple Music integration.
- **Phase 3:** Gantt + dependencies, time tracking, collaboration, file attachments, analytics, Siri/App Intents, widgets, Apple Watch, iPad.

## License

TBD.
