# Linear alignment log

Audit trail for the 2026-05-22 Linear alignment pass. Inventory: [linear-alignment-inventory.md](linear-alignment-inventory.md).

**Ongoing agent responsibility:** Keep Linear, [RUNNING TASKLIST](../RUNNING%20TASKLIST.md), [INBOX](../INBOX.md) triage, and code aligned per [`.cursor/rules/toronto-rising-linear.mdc`](../../.cursor/rules/toronto-rising-linear.mdc).

## Summary

| Metric | Count |
|--------|-------|
| Domain projects created | 12 |
| New labels | 9 |
| Parent epics created | TOR-30 – TOR-43 |
| Legacy issues updated | TOR-1 – TOR-29 |
| New feature/tasklist issues | TOR-44 – TOR-114 |
| **Total issues after alignment** | **114** |
| **Total issues after 2026-05-23 sync** | **133** |

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

## 2026-05-23 — Post-alignment commit sync

Agents shipped ~24 commits referencing phantom Linear ids `TOR-123`–`TOR-146` before the Linear MCP was available in those sessions. Created real issues **TOR-115**–**TOR-133** (Done) and updated existing issues.

| Action | Linear IDs | Notes |
|--------|------------|-------|
| CREATE (Done) | TOR-115 – TOR-133 | Retroactive tracking for May 2026 commits |
| CLOSE_DONE | TOR-75 | Oblivion rouse E2E (code complete; verify in TTS) |
| UPDATE | TOR-79 | In Progress — ST NPC rolls partial (camera remaining) |
| COMMENT | TOR-44, TOR-45, TOR-51, TOR-70, TOR-79 | Cross-links to new issues |
| UPDATE | `.dev/RUNNING TASKLIST.md` | TOR-75 checked |

### Phantom commit ref → actual Linear id (selected)

| Commit phantom | Actual Linear | Topic |
|----------------|---------------|-------|
| TOR-123/124 | TOR-116 | Custom UI assets pipeline |
| TOR-125/126 | TOR-117 | U.delay migration |
| TOR-127 | TOR-115 | NPC figurine lock |
| TOR-128 | TOR-119 | Staggered group spawn |
| TOR-129 | TOR-118 | NPC slot resolution |
| TOR-130 | TOR-120 | Page 4 Thrall cleanup |
| TOR-131 | TOR-121 | NPC spawn errors |
| TOR-132 | TOR-124 | Overlay layout tweaks |
| TOR-133 | TOR-123 | Testbed/debug docs |
| TOR-134 | TOR-122 | InputField callbacks |
| TOR-135 | TOR-128 | Soundscape/lighting dedup |
| TOR-136 | TOR-125 | HUD sync scope |
| TOR-137 | TOR-129 | UI XML embed build |
| TOR-138 | TOR-127 | TTS bundling page3 |
| TOR-139 | TOR-126 | luabundle save inject |
| TOR-140 | TOR-130 | presentDayClock HUD |
| TOR-141 | TOR-131 | Dice pt.2 enhancements |
| TOR-142/143/146 | TOR-133 | BP decals + merge |
| TOR-144/145 | TOR-132 | Conditions refactor + docs |

## 2026-05-25 — INBOX capture workflow

| Date | Action | File | Notes |
|------|--------|------|-------|
| 2026-05-25 | CREATE | `.dev/INBOX.md` | Quick capture: `[bug]` / `[intent]` / `[idea]` before Linear promotion |
| 2026-05-25 | UPDATE | `.dev/INBOX.md`, workflow docs | Clarify-then-promote triage; **Needs clarification** section |
| 2026-05-25 | CREATE | TOR-135 – TOR-141 | First inbox triage batch |
| 2026-05-25 | CREATE | TOR-142 | Apply active scene four clock buttons (inbox clarification pass) |
| 2026-05-25 | UPDATE | TOR-81, workflow docs | Light modes scope + inline `Answer:` clarification loop |
| 2026-05-25 | UPDATE | `.cursor/rules/toronto-rising-linear.mdc`, `.cursorrules`, `AGENTS.md` | INBOX paths and triage for agents |
| 2026-05-25 | UPDATE | RUNNING TASKLIST **Focus**, workflow docs | Stack rank: bugs → TOR-141 → TOR-137 → TOR-81; Linear priorities synced |
| 2026-05-25 | CREATE | `.cursor/commands/tr-inbox.md` | `/tr-inbox`: inbox triage + Focus/Linear sync for `/tr-start` handoff |
| 2026-05-25 | CREATE | TOR-143 | Phase system redesign (inbox batch 2) |
| 2026-05-25 | CANCELED | TOR-90 | Superseded by TOR-143 |
| 2026-05-25 | UPDATE | TOR-98, TOR-101 | Partial design absorbed into TOR-143 |
| 2026-05-25 | UPDATE | TOR-81 | Priority → Low (deferred behind Focus bugs + TOR-141) |
| 2026-05-25 | UPDATE | Workflow docs | Precedence vs priority decoupled; liberal `blockedBy`; deferral ≠ Low |
| 2026-05-25 | UPDATE | Workflow docs | Anti-gridlock rules for liberal `blockedBy` (star pattern, cap ~6) |
| 2026-05-25 | UPDATE | Linear relations | Focus/deferred `blockedBy` star pattern; sub-issues TOR-98/101→143, TOR-100→98; TOR-90 duplicateOf TOR-143; CREATE TOR-144 (multiplayer E2E sub of TOR-141) |
| 2026-05-25 | CREATE | TOR-145 – TOR-147 | Inbox batch 3: end-scene library sync, delete-live-scene-first, blindfold soundscape fade |
| 2026-05-25 | UPDATE | RUNNING TASKLIST **Focus** | Insert TOR-145 (end scene library sync) at #2; tasklist bullets for TOR-145/146/147 |
| 2026-05-25 | PARK | INBOX Needs clarification | Intermittent real-time clock speed faster than multiplier |
| 2026-05-25 | CREATE | TOR-148 | Real-time clock faster than multiplier (answered clarification pass) |
| 2026-05-25 | DONE | TOR-135 | Import root validator rejects mis-nested `npcWorld`; not a reconcile bug |
| 2026-05-25 | CREATE | TOR-149 – TOR-152 | Inbox batch 4: ST dice tray lights, thunder ducking, default no-scene, Play load scene restore |
| 2026-05-25 | UPDATE | TOR-151 | Author clarification: “clock cleared” = overlay display only; do not mutate library clock or present-day clock |
| 2026-05-25 | UPDATE | Focus + Linear relations | Back-burner approved: TOR-149–152 deferred; blockedBy star pattern applied |
| 2026-05-25 | DONE | TOR-136 | Weather audio burst on scene switch — author verified; silent stub + deferred volume arm, rain/wind hold, library Apply reconcile fingerprint timing |
| 2026-05-25 | UPDATE | RUNNING TASKLIST **Focus** | TOR-136 removed from stack; TOR-138 promoted to #1 |
| 2026-05-25 | UPDATE | `.dev/Soundscape & Audio/SOUNDSCAPE_LUA_IMPLEMENTATION.md` | Document clip-swap burst mitigation + rain/wind hold (TOR-136) |
| 2026-05-25 | CREATE | TOR-153, TOR-154 | Inbox batch 5: map pin unmappable/stale offset; floor/plinth LockedObjects |
| 2026-05-25 | UPDATE | TOR-147 | Expand scope: weather fade policy on blindfold scene switch |
| 2026-05-25 | COMMENT | TOR-148 | INBOX: uncleared clock interval hypothesis |
| 2026-05-25 | UPDATE | RUNNING TASKLIST, INBOX, Focus deferred | TOR-146/147/148 on deferred line; TOR-153/154 pending back-burner confirm |
| 2026-05-25 | DONE | TOR-138 | Silence for save: physical-only emitter silence; stopAll removed; load branch deferred to TOR-152 |
| 2026-05-25 | COMMENT | TOR-152 | Absorb load soundscape branch scope from TOR-138 close |
| 2026-05-25 | UPDATE | TOR-141 | Baseline E2E playbooks shipped; reopened **In Progress** + label `living-doc` (ongoing maintenance, not Done) |
| 2026-05-25 | UPDATE | TOR-141, workflow docs | `living-doc` in `toronto-rising-linear.mdc` + `DEVELOPMENT_WORKFLOW.md`; TOR-141 description link fix |
| 2026-05-25 | CREATE | TOR-155 – TOR-159 | Inbox batch 6: roll panel dots, roll broadcast trim, seat modal, Blood Surge conditions, frenzy threshold |
| 2026-05-25 | UPDATE | TOR-73 | Take Half broadcast synthetic dice display scope from inbox |
| 2026-05-25 | COMMENT | TOR-147 | INBOX: abrupt weather fade-in may resolve with blindfold fade sequencing |
| 2026-05-25 | UPDATE | RUNNING TASKLIST **Focus** | Dice bugs TOR-159/158/155 → #1–3; TOR-137 #4; TOR-81 #5; TOR-156/157 pending back-burner |
| 2026-05-25 | UPDATE | Focus + Linear relations | Back-burner approved: TOR-153/156/157 deferred + `blockedBy`; TOR-154 kept in Focus (#4) as quick fix |
| 2026-05-26 | DONE | TOR-159 | Frenzy queue only when hunger already at MAX before rouse bump |
| 2026-05-26 | DONE | TOR-158 | Blood Surge uses condition-aware BP + fresh roll policy at activation |
| 2026-05-26 | INBOX | Dice-E2E.md pass | Processed 😀/❌/⚠️ markers per AGENT INSTRUCTION |
| 2026-05-26 | CREATE | TOR-161 | Bug: normal bag right-click does not undo hunger (Dice-E2E A2/K2) |
| 2026-05-26 | CREATE | TOR-162 | Bug: ST per-roll Opts not persisting/applying (Dice-E2E G6/G7) |
| 2026-05-26 | CREATE | TOR-163 | Bug: roll broadcast empty when no difficulty (Dice-E2E Suite E) |
| 2026-05-26 | CREATE | TOR-164 | Sub-issue of TOR-141: Dice-E2E playbook + rollTest harness (all 😀) |
| 2026-05-26 | UPDATE | TOR-73 | Dice-E2E Suite H: H2 rouse auto-parse; H1 images; related TOR-156 |
| 2026-05-26 | COMMENT | TOR-141 | E2E pass summary + new issue ids |
| 2026-05-26 | UPDATE | RUNNING TASKLIST **Focus** | TOR-155 → #1; TOR-162 → #2; TOR-161 → #3; TOR-163 → #4; TOR-154/137/81 deferred |
| 2026-05-26 | UPDATE | RUNNING TASKLIST **Focus** | Author: TOR-164 (Dice-E2E harness) → #1; dice bugs 155/162/161/163 → #2–5; TOR-164 Linear priority → High |
| 2026-05-26 | UPDATE | TOR-155, TOR-156, TOR-161 | Pool composition spec: single rouse check, rouse/obliv exclusivity, Blood Surge undo via Hunger R-C, no rouse tagging |
| 2026-05-26 | COMMENT | TOR-141 | Dice pool rules doc + code alignment |
| 2026-05-26 | CODE+DOC | Dice rouse pool | `global_script`, `roll_controller`, `dice_kinds`, `dice_bag`, `rouse_outcomes`; Dice System Pt. 2; Dice-E2E |
| 2026-05-26 | CREATE | TOR-165 | Bug: WP reroll wave stalls on partial settle; no Confirm during ROLLING wave (Dice-E2E I1); related TOR-141 |
| 2026-05-26 | DOC | Dice-E2E H–J | Auto spawn, `rollCancel` first, Pass if, `rollE2eExpectBroadcast` / `rollE2eAddPoolKindSpawn`; Suite I restructured |
| 2026-05-27 | INBOX | duplicate | No-difficulty broadcast re-capture → existing TOR-163 (Focus #4) |
| 2026-05-27 | CREATE | TOR-166 | Widen Far Left / Far Right NPC stage area angles (inbox) |
| 2026-05-27 | CREATE | TOR-167 | Add Mid-Center + Far-Center NPC stage areas; `blockedBy` TOR-166 |
| 2026-05-27 | UPDATE | RUNNING TASKLIST **Focus** | Dated 2026-05-27; TOR-165 on deferred line; TOR-166/167 tasklist bullets; back-burner pending |
| 2026-05-27 | UPDATE | RUNNING TASKLIST **Deferred** | Back-burner approved: TOR-166, TOR-167 on deferred line (Medium; TOR-167 blockedBy TOR-166) |
| 2026-05-27 | CANCEL | TOR-166, TOR-167 | Superseded by TOR-169 (Storyteller NPC gameboard); RUNNING TASKLIST Focus **Canceled** line + `[x]` bullets; INBOX Processed relabeled |
| 2026-05-27 | DONE | TOR-155 | Roll panel pool dots color coding — author verified; Focus re-stack (162/161/163) |
| 2026-05-27 | CREATE | TOR-168 | Audit Sync.full usage — narrow sync entry points (Urgent; Synchronization & State; parent TOR-30) |

See `.dev/DEVELOPMENT_WORKFLOW.md` § Linear synchronization, § Inbox capture & triage, and § Focus & backlog prioritization — diff RUNNING TASKLIST against Linear monthly or before releases; run **“process the inbox”** when Active or unanswered **Needs clarification** items pile up; re-stack **Focus** before play sessions or ~weekly.
