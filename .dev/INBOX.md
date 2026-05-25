# Inbox — quick capture (bugs, intents, ideas)

**Dump one-line notes while testing or mid-task.** No templates. Prefixes and module tags are optional — the triage agent infers type and domain when you say **“process the inbox”**.

**Authoritative tracking lives elsewhere:**

| When                    | Where                                                         |
| ----------------------- | ------------------------------------------------------------- |
| Quick note (this file)  | `.dev/INBOX.md`                                               |
| Scheduled / shaped work | Linear `TOR-*` + [RUNNING TASKLIST.md](RUNNING%20TASKLIST.md) |
| Implementation truth    | Code + `.dev/` docs                                           |

**Agents:** [DEVELOPMENT_WORKFLOW.md § Inbox capture & triage](DEVELOPMENT_WORKFLOW.md#inbox-capture--triage). Slash: **`/tr-inbox`** — full triage + Focus/Linear sync (prep for **`/tr-start`** in a new chat). Always-on: [`.cursor/rules/toronto-rising-linear.mdc`](../.cursor/rules/toronto-rising-linear.mdc).

---

## How to capture (human)

Add a single line under **Active** (any subsection, or pick Bugs / Intents / Ideas if you like). Examples:

```markdown
- weather ducking stuck after site change
- [bug] roll camera jumpy
- centralize seat light modes in C.LightModes
- ST rolls for NPCs from dice panel
```

Optional hints: `[bug]`, `[intent]`, `[idea]`, `[dice]`, `[lighting]`, … — never required.

**You do not** create Linear issues or tasklist bullets. The triage agent promotes clear items (Backlog and/or RUNNING TASKLIST) based on its assessment.

**Fix in <5 min while already in code?** Fix → commit → Linear **Bug** retroactively. Skip the inbox.

**Do not use GitHub Issues** — Linear is primary.

---

## Clarification loop (standard)

When triage parks an item under **Needs clarification**:

1. The agent adds **`?` question bullets** under the item (in this file).
2. **You reply inline** on the same bullets: append **`Answer:`** on the question line, or add an indented `- Answer: …` bullet immediately below.
3. Say **“process the inbox”** again — the agent reads answers from the file and promotes (no need to repeat answers in chat).

```markdown
- roll camera jumpy
  - ? Which seat color(s) and roll phase?
  - Answer: Orange, during baton handoff to PRE_ROLL
```

Chat summaries of clarifications are optional; **the file is the source of truth** for answers.

---

## Active

_One-line captures. Triage agent moves processed items to **Processed**; unclear items go to **Needs clarification**._

### Bugs

<!-- - one line -->

### Intents (planned changes, refactors, direction)

<!-- - one line -->

### Ideas (new features, design not ready)

<!-- - one line -->

---

## Needs clarification

*Agent parked items here with `?` questions. Reply inline with **`Answer:`** on each question (see **Clarification loop** above), then say **“process the inbox”** again.*

### Bugs

### Intents

### Ideas

---

## Processed

*Archive: `YYYY-MM-DD TOR-XXX — summary` | `YYYY-MM-DD dismissed — reason` | `YYYY-MM-DD → Needs clarification`*

- 2026-05-25 TOR-135 — [bug] NPC area cutouts missing on active scene apply
- 2026-05-25 TOR-136 — [bug] Weather audio burst on scene switch
- 2026-05-25 TOR-137 — [intent] Normalize unicode minus in C.Sites offsetXY on import
- 2026-05-25 TOR-138 — [bug] Soundscape not resyncing after load post silence-for-save
- 2026-05-25 TOR-139 — [intent] Scenes panel trim + 3-column library grid
- 2026-05-25 TOR-140 — [intent] Sound panel trim + larger text
- 2026-05-25 TOR-141 — [intent] Manual E2E test playbooks (Dice + Scenes)
- 2026-05-25 → Needs clarification — Light modes cleanup / presets grid
- 2026-05-25 → Needs clarification — Apply active scene four-button clock UX
- 2026-05-25 TOR-81 — [intent] Light modes cleanup expanded (answered clarification pass)
- 2026-05-25 TOR-142 — [feature] Apply active scene four clock-aware buttons (answered clarification pass)
