# Architecture

## Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                     iOS app (SwiftUI, iOS 17+)                    │
│                                                                   │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │  Features/   │  │ DesignSystem │  │  Core/NLP   │               │
│  │  views + VMs │  │ Theme,Tokens │  │  NL parser  │               │
│  └──────┬───────┘  └──────────────┘  └──────┬──────┘               │
│         │                                   │                      │
│  ┌──────▼────────────────────────────────────▼────────────┐        │
│  │                    Core/                                │        │
│  │  Models (SwiftData)  Sync (outbox)  Notifications       │        │
│  └──┬──────────────────────┬────────────────┬──────────────┘        │
│     │                      │                │                       │
│  ┌──▼──────────┐     ┌─────▼──────┐   ┌─────▼────────┐              │
│  │  Supabase   │     │    AI/     │   │   Focus/     │              │
│  │  client     │     │ AgentRunner│   │  FocusModeInt│              │
│  │ (postgrest, │     │ LLMProvider│   └──────────────┘              │
│  │  realtime,  │     │ + Tools    │                                 │
│  │  auth)      │     │ + Keychain │                                 │
│  └──────┬──────┘     └────┬───────┘                                 │
└─────────┼─────────────────┼─────────────────────────────────────────┘
          │ JWT             │ user's API key (Keychain)
          ▼                 ▼
  ┌──────────────┐   ┌────────────────────────────────┐
  │  Supabase    │   │  OpenAI / Anthropic / Gemini   │
  │  Postgres    │   │  / Groq (BYOK)                 │
  │  + RLS       │   └────────────────────────────────┘
  └──────────────┘
```

Two independent flows:
1. **CRUD** — iOS talks directly to Supabase Postgrest with the user's JWT. Row-Level Security enforces ownership.
2. **AI** — iOS talks directly to the LLM provider with the user's own API key (read from the Keychain). The `AgentRunner` orchestrates the tool-use loop on-device. When the model asks to run a tool, the tool executes via the same Supabase client (so RLS applies automatically).

No server-side AI infrastructure is needed. Every user pays their own inference bill.

## BYOK (Bring Your Own Key)

- User pastes their API key in **Settings → AI**.
- Stored with `kSecAttrAccessibleAfterFirstUnlock` in the Keychain.
- Default provider: **OpenAI** with `gpt-4o-mini`. Upgrade to `gpt-4o` only for `break_down_task` and `daily_brief`.
- Never logged, never sent anywhere else, purgeable from Settings.
- Fallback behaviour when no key is set: AI buttons open the onboarding sheet; all non-AI features remain fully usable.

## Data flow: creating a task by voice

```
User long-presses tab bar
  → VoiceCaptureView records audio
  → SFSpeechRecognizer (on-device) transcribes
  → AgentRunner(transcript) → LLMProvider.chat(tools=[create_task, …])
      → model replies with tool_use "create_task" { title, due, … }
  → AgentRunner executes tool locally:
      → FrenchEnglishDateParser resolves "demain 10h" → ISO timestamp
      → SupabaseClient.from("tasks").insert(…)
      → SwiftData mirror updated
  → Agent returns final message "OK, j'ai ajouté 'Acheter du pain' pour demain 10h 🔥"
  → UI shows the result, Inbox updates via Realtime
```

## Offline

- SwiftData is the source of truth locally.
- An `Outbox` queues mutations (insert/update/delete) with monotonic client timestamps.
- On `SyncEngine.flush()`, the outbox plays back to Supabase; conflicts resolved last-write-wins by `updated_at`.
- Realtime subscription refreshes SwiftData when remote changes arrive.

## Security

- `ANON_KEY` ships in the app (safe by design: RLS enforces isolation).
- `SERVICE_ROLE_KEY` stays on the developer's machine, never in the app.
- User API keys stay in Keychain only.
- Supabase RLS policy on every table: `user_id = auth.uid()` for root-owned rows, `exists(...)` for child rows.
