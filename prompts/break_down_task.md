# Break Down Task — Sub-prompt

Used by `break_down_task` tool when the agent needs to split a big task into smaller, concrete subtasks before inserting them.

## Goal

Given a parent task title (and optional description), produce **at most N** subtasks (default N=5) that, together, complete the parent. Each subtask must be:

1. **Concretely actionable** — starts with a verb, under 8 words.
2. **Small** — fits in ≤ 45 minutes of focused work. If bigger, split further.
3. **Ordered** — listed in the order a person would actually do them.
4. **Independent when possible** — subtasks that block each other should be noted in description, not enforced as dependencies (dependencies are Phase 3).
5. **In the user's language** — match the parent task's language (FR or EN).

## Output format

Return a JSON array of objects:

```json
[
  { "title": "Draft outline in Notion",           "estimated_minutes": 25, "energy_level": "medium" },
  { "title": "Review with Marc by Slack",         "estimated_minutes": 10, "energy_level": "low" },
  { "title": "Rewrite intro based on feedback",   "estimated_minutes": 30, "energy_level": "high" }
]
```

- `title` (required): the subtask title
- `estimated_minutes` (optional): integer, realistic — don't pad
- `energy_level` (optional): `"low"` | `"medium"` | `"high"`

## Anti-patterns to avoid

- ❌ "Think about the project" — not actionable
- ❌ "Do some research" — too vague, no clear stopping point
- ❌ "Finish the whole feature" — too big
- ❌ "Meeting" — not a verb-start

## Good patterns

- ✅ "Open Figma and sketch two homepage variants"
- ✅ "List three people to ask for feedback"
- ✅ "Write a 5-line changelog entry"
- ✅ "Book a 30-minute slot with the dentist"

## ADHD-specific heuristics

- **Seed a tiny first step.** The first subtask should be ≤ 5 minutes so starting feels painless (open the doc, open the app, write one sentence).
- **Close the loop.** Include a "wrap up" final subtask if the parent is an external commitment (send the email, notify the person, mark as shipped).
- **No blank infinities.** Every subtask must have a recognisable "done" signal.
