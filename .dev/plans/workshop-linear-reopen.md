# Workshop Linear issues — reopen from Canceled

**Date:** 2026-06-04  
**Issues:** TOR-43 (epic), TOR-105, TOR-106, TOR-107, TOR-108, TOR-109, TOR-110, TOR-111, TOR-112, TOR-113, TOR-114

## Linear UI (if MCP `save_issue` does not transition state)

1. Filter team **Toronto Rising** → status **Canceled** → project **Out of Scope (Workshop)** (or search `TOR-10`).
2. Multi-select all rows above (except do not re-cancel TOR-166/167 — those stay canceled).
3. Set status → **Backlog**, priority → **Medium** (epic TOR-43: **Medium**; children: **Medium** unless you prefer **No priority** only for true placeholders).
4. Ensure label **`workshop-only`** remains on children.

## Description block (prepend to each child issue)

```markdown
## Human gate

**Agents:** Do not implement in repo — author-owned (TTS workshop / external art / design). See `.dev/RUNNING TASKLIST.md` §Out of Scope for Cursor.

---
```

## TOR-43 epic description (replace Scope line about Canceled)

```markdown
## Scope

Workshop-only art, save tuning, and external tools. Child issues stay **Backlog** with **`workshop-only`**.

## Human gate

**Agents:** Do not implement in repo — author-owned work. Resurface from RUNNING TASKLIST §Out of Scope; do not pick up for IDE implementation unless the author clears the gate.

## Source

RUNNING TASKLIST §Out of Scope for Cursor
```

## After reopen

- Do **not** add these to **Focus** unless you schedule workshop work this cycle.
- Agents: skip `workshop-only` / human-gate issues unless the author explicitly asks for repo support (e.g. test-bed helper for TOR-114).
