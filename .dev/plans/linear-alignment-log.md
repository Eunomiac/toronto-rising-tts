# Linear alignment log

Audit trail for the 2026-05-22 Linear alignment pass. Inventory: [linear-alignment-inventory.md](linear-alignment-inventory.md).

**Ongoing agent responsibility:** Keep Linear, [RUNNING TASKLIST](../RUNNING%20TASKLIST.md), and code aligned per [`.cursor/rules/toronto-rising-linear.mdc`](../../.cursor/rules/toronto-rising-linear.mdc).

## Summary

| Metric | Count |
|--------|-------|
| Domain projects created | 12 |
| New labels | 9 |
| Parent epics created | TOR-30 – TOR-43 |
| Legacy issues updated | TOR-1 – TOR-29 |
| New feature/tasklist issues | TOR-44 – TOR-114 |
| **Total issues after alignment** | **114** |

## 2026-05-22 — Structure

| Date | Action | Linear ID | feature_id | Notes |
|------|--------|-----------|------------|-------|
| 2026-05-22 | CREATE_PROJECT | Foundation & Tooling | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Synchronization & State | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Dice & Rolls | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Scenes & Chronicle | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Lighting & Camera | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | NPC & Spotlight | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Soundscape & Audio | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | UI & HUD | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Character Sheets | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Players & Connection | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Table Objects | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Agent Reviews & Quality | — | Domain project |
| 2026-05-22 | CREATE_PROJECT | Out of Scope (Workshop) | — | Domain project |
| 2026-05-22 | CREATE_LABEL | module:conditions, module:dice, module:npcs, module:soundscape, module:sync, module:rolls, source:tasklist, workshop-only, epic | — | Team labels |
| 2026-05-22 | CREATE_EPIC | TOR-30 | foundation-epic | Done |
| 2026-05-22 | CREATE_EPIC | TOR-31 | dice-epic | In Progress |
| 2026-05-22 | CREATE_EPIC | TOR-32 | sync-epic | Done |
| 2026-05-22 | CREATE_EPIC | TOR-33 | scenes-epic | In Progress |
| 2026-05-22 | CREATE_EPIC | TOR-34 | lighting-epic | In Progress |
| 2026-05-22 | CREATE_EPIC | TOR-35 | npc-epic | In Progress |
| 2026-05-22 | CREATE_EPIC | TOR-36 | soundscape-epic | In Progress |
| 2026-05-22 | CREATE_EPIC | TOR-37 | ui-epic | In Progress |
| 2026-05-22 | CREATE_EPIC | TOR-38 | sheets-epic | Backlog |
| 2026-05-22 | CREATE_EPIC | TOR-39 | agent-reviews-epic | In Progress |
| 2026-05-22 | CREATE_EPIC | TOR-40 | players-epic | Backlog |
| 2026-05-22 | CREATE_EPIC | TOR-41 | table-objects-epic | Backlog |
| 2026-05-22 | CREATE_EPIC | TOR-42 | new-features-epic | Backlog |
| 2026-05-22 | CREATE_EPIC | TOR-43 | workshop-epic | Canceled |

## 2026-05-22 — Legacy TOR-1–29

| Date | Action | Linear ID | Notes |
|------|--------|-----------|-------|
| 2026-05-22 | UPDATE + CLOSE_DONE | TOR-1,3,5,7 | Moved to Foundation & Tooling, parent TOR-30 |
| 2026-05-22 | UPDATE + CLOSE_DONE | TOR-9,10 | Moved to Lighting & Camera, parent TOR-34 |
| 2026-05-22 | UPDATE + CLOSE_DONE | TOR-14 | Moved to Scenes & Chronicle, parent TOR-33 |
| 2026-05-22 | CLOSE_DONE | TOR-12,16,18,20,22,28 | Shipped; migrated to domain projects |
| 2026-05-22 | CLOSE_DONE | TOR-2,4,6 | Testbed coverage; parent TOR-39 |
| 2026-05-22 | CLOSE_DONE | TOR-26 | AVAILABLE_FUNCTIONS maintained |
| 2026-05-22 | CANCELED | TOR-17 | Superseded by TOR-16 |
| 2026-05-22 | UPDATE | TOR-8,11,13,15,19,21 | QA backlog under TOR-39 |
| 2026-05-22 | UPDATE | TOR-23,24,25,27,29 | Backlog/In Progress under domain epics |

## 2026-05-22 — New issues TOR-44–114

| Date | Action | Linear ID range | Notes |
|------|--------|-----------------|-------|
| 2026-05-22 | CREATE (Done) | TOR-44 – TOR-70 | Shipped features retroactively tracked |
| 2026-05-22 | CREATE (Backlog) | TOR-72 – TOR-103 | Open RUNNING TASKLIST items |
| 2026-05-22 | CREATE (Canceled) | TOR-105 – TOR-114 | Workshop out-of-scope rows |

## 2026-05-22 — Repo docs

| Date | Action | File | Notes |
|------|--------|------|-------|
| 2026-05-22 | UPDATE | `.dev/RUNNING TASKLIST.md` | TOR ids on all bullets and out-of-scope table |
| 2026-05-22 | CREATE | `.dev/plans/linear-alignment-inventory.md` | Stage A inventory + matrix |
| 2026-05-22 | UPDATE | `.dev/DEVELOPMENT_WORKFLOW.md` | Linear sync section |

## Key shipped features now tracked (selected)

| Linear | Feature |
|--------|---------|
| TOR-44 | Conditions registry |
| TOR-47 | Roll policy layer |
| TOR-51 | Roll controller FSM pt.2 |
| TOR-55 | Scene library |
| TOR-67 | Soundscape reconciler |
| TOR-66 | Rotational seat layout |

## Ongoing hygiene

See `.dev/DEVELOPMENT_WORKFLOW.md` § Linear synchronization — diff RUNNING TASKLIST against Linear monthly or before releases.
