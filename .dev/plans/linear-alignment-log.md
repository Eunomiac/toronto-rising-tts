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
| 2026-05-22 | CREATE (Canceled) | TOR-105 – TOR-114 | Workshop out-of-scope rows — **superseded 2026-06-04:** reopen to **Backlog** (see below) |

## 2026-06-04 — Workshop issues: Canceled → Backlog (human-gate)

**Intent:** TOR-43, TOR-105–TOR-114 were wrongly **Canceled** at creation (“traceability”). They are live author-owned work — **Backlog** + **`workshop-only`** + `## Human gate` in description. Agents do not implement.

**Repo:** `DEVELOPMENT_WORKFLOW.md` § Human-gated work; `.cursor/rules/toronto-rising-linear.mdc` § Human-gated vs Canceled; RUNNING TASKLIST §Out of Scope wording.

**Linear MCP:** `save_issue` with `state: "Backlog"` (or state id `43add8cd-3f26-49b5-958c-a33fadd7bbf5`) did not transition canceled issues in-agent (2026-06-04) — **author:** bulk-select in Linear → set status **Backlog**, priority **Medium**, paste human-gate block from `.dev/plans/workshop-linear-reopen.md` if needed.

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
| 2026-06-02 | COMMIT | TOR-169 | `a0271ac` — circular-require fix, Z-flip token rotation, placements-only reconcile + byArea migration |
| 2026-06-02 | INBOX | 5 bullets | NPC gameboard capture — promoted TOR-170–174; dice bag item deferred under TOR-79 |
| 2026-06-02 | CREATE | TOR-170 | Bug: control board tokens missing on load with on-stage figurines (child TOR-169; Focus #2) |
| 2026-06-02 | CREATE | TOR-171 | Improvement: figurine yaw from ring origin; ignore token Y (child TOR-169; Focus #3) |
| 2026-06-02 | CREATE | TOR-172 | Feature: snapGroups defaultLightMode on palette drop only (child TOR-169; Focus #4) |
| 2026-06-02 | CREATE | TOR-173 | Feature: lerp figurine moves between stage placements (child TOR-169; Focus #5) |
| 2026-06-02 | CREATE | TOR-174 | Feature: NPC token on ST dice bag initiates roll (child TOR-79; `blockedBy` TOR-169; deferred) |
| 2026-06-02 | UPDATE | RUNNING TASKLIST **Focus** | Gameboard cycle: TOR-169 + TOR-170/171/172/173; dice E2E 161/162/163 + TOR-174 deferred |
| 2026-06-02 | COMMENT | TOR-169 | Session ship note + inbox promotion summary |
| 2026-06-02 | DONE | TOR-170, TOR-171 | Load token mirror from palette; master-origin yaw; palette onLoad + local-order fix; author verified Save & Play |
| 2026-06-02 | INBOX | 4 bullets | Anchor spread order, XmlUI Host-only, duplicate seat figure, TOR-173 lerp clarification |
| 2026-06-02 | CREATE | TOR-175 | Anchor family spread slot order from center (child TOR-169; Focus #4) |
| 2026-06-02 | CREATE | TOR-176 | Control board XmlUI Host-only (child TOR-169; Focus #3) |
| 2026-06-02 | CREATE | TOR-177 | Duplicate SEAT_FIGURE on scene activate (child TOR-169; Focus #2; Urgent) |
| 2026-06-02 | UPDATE | TOR-173 | Expanded Apply-only lerp spec from inbox clarification |
| 2026-06-02 | UPDATE | RUNNING TASKLIST **Focus** | Quick fixes TOR-177/176 above TOR-175/172/173 |
| 2026-06-02 | DONE | TOR-176, TOR-177 | Host-only XmlUI visibility; hide workshop SEAT_FIGURE anchors in Step Four |
| 2026-06-04 | INBOX | 3 bullets | Anchor spread palette light → shipped (TOR-172 comment); seat figure ID → TOR-179; Tarot hide → duplicate TOR-96 |
| 2026-06-04 | CREATE | TOR-179 | Workshop SEAT_FIGURE anchor ID without name/nickname (child TOR-169; Backlog Medium) |
| 2026-06-04 | UPDATE | TOR-96 | INBOX re-capture comment; Linear priority Medium |
| 2026-06-04 | UPDATE | Focus **Deferred** | Back-burner approved: TOR-179 (`blockedBy` TOR-178), TOR-96; resurfacing note in RUNNING TASKLIST Focus |
| 2026-06-04 | DOC | Deferred resurfacing | Gate-close survey on Done/Canceled: `toronto-rising-linear.mdc`, `DEVELOPMENT_WORKFLOW.md`, RUNNING TASKLIST Focus, `AGENTS.md` |
| 2026-06-04 | INBOX | NPC panel / Features 1–2 | TOR-180 seat row (Focus #2, blocks TOR-178); TOR-181 panel retire deferred; Feature 1 → TOR-174 duplicate |
| 2026-06-04 | DONE | TOR-180 | Seat-assignment snap row shipped (`6cf894e`); Done comment + deferred resurfacing (TOR-178, TOR-179, TOR-181) |
| 2026-06-04 | UPDATE | TOR-178 | Cleared `blockedBy` TOR-180 (prerequisite Done); remains In Progress / Focus #2 |
| 2026-06-04 | RESURFACE | TOR-96 | Removed from Deferred this cycle; cleared `blockedBy`; gate TOR-180 Done |
| 2026-06-04 | UPDATE | TOR-181 | `blockedBy` narrowed to TOR-174 only (TOR-180 Done) |
| 2026-06-04 | DONE | TOR-182 | Apply vacate NPC seat when token off CONTROL_BOARD (`4a9370f`); related TOR-180, TOR-178; seat-row snap rotation |
| 2026-06-06 | INBOX | 16 bullets | Performance audit, dice rouse double, gameboard scale/rot/lag/table, Hunger 5 rules, Compulsions, grimoire, resonance, chronicle content, roll conditions |
| 2026-06-06 | CREATE | TOR-197 | Event listener early-return audit + policy (Urgent; Focus #1; parent TOR-39) |
| 2026-06-06 | CREATE | TOR-198 | Bug: Rouse check Roll doubles staged dice (Urgent; Focus #2; parent TOR-31) |
| 2026-06-06 | CREATE | TOR-199 | Seated snap row token 2× scale on Apply (Medium; parent TOR-169) |
| 2026-06-06 | CREATE | TOR-200 | Bug: seat-assignment snap 180° Y rotation (High; parent TOR-169) |
| 2026-06-06 | CREATE | TOR-201 | Clear / token-drop lag (`blockedBy` TOR-197; High; parent TOR-169) |
| 2026-06-06 | CREATE | TOR-202 | Bug: duplicate table models on control board (High; parent TOR-169) |
| 2026-06-06 | CREATE | TOR-203 | Hunger 5 lock voluntary rouse — Blood Surge + Obliv-Rouse (Medium; parent TOR-31) |
| 2026-06-06 | CREATE | TOR-204 | Compulsions deck on Bestial Failure (Medium; parent TOR-42) |
| 2026-06-06 | CREATE | TOR-205 | Discipline card grimoire storage (Backlog Medium; parent TOR-38) |
| 2026-06-06 | CREATE | TOR-206 | Resonance type & temperament after hunting (Backlog Medium; parent TOR-42) |
| 2026-06-06 | CREATE | TOR-207 | Chronicle: generic encounter NPC list (`workshop-only`; Backlog) |
| 2026-06-06 | CREATE | TOR-208 | Chronicle: ST improv stats reference (`workshop-only`; Backlog) |
| 2026-06-06 | CREATE | TOR-209 | Roll panel show active roll conditions (Backlog Medium; parent TOR-37) |
| 2026-06-06 | UPDATE | RUNNING TASKLIST **Focus** | TOR-197/198 above TOR-169/178/173; back-burner pending for TOR-199–206, TOR-209 deferrals |
| 2026-06-06 | UPDATE | Back-burner approved | TOR-199–202 **in Focus** (#3–#6); TOR-203/204/209 deferred + `blockedBy` TOR-198; TOR-205/206 deferred; TOR-207/208 workshop-only |
| 2026-06-06 | DONE | TOR-197 | O(1) physical listener gates, figurine GUID cache, zones deactivated on load; Event Listener Policy |
| 2026-06-06 | DONE | TOR-201 | Clear/token-drop lag — resolved via TOR-197 listener audit; author may reopen if lag persists |
| 2026-06-06 | UPDATE | RUNNING TASKLIST **Focus** | TOR-198 top; TOR-197/201 Done this cycle |
| 2026-06-15 | DONE | TOR-200 | Seat snap Y-rotation — board-local Y=180° offsets CONTROL_BOARD world Y=180°; author confirmed |
| 2026-06-15 | DONE | TOR-199 | Seat-row token scale 0.7/0.2 polar; drop-handler scale revert; author confirmed |
| 2026-06-15 | CREATE | TOR-210 | Bug: Apply + seat/table snap does not seat NPC at table (High; Focus #1; parent TOR-169) |
| 2026-06-15 | UPDATE | RUNNING TASKLIST **Focus** | TOR-210 #1; TOR-202 #2; TOR-178 #3; TOR-200/199 Done this cycle |
| 2026-06-15 | INBOX | 5 bullets promoted | TOR-211–213 workshop (TOR-43); TOR-214 dice copy; TOR-215 seated NPC scale reset |
| 2026-06-15 | UPDATE | TOR-154 | Scope expanded to full `C.LockedObjects`; Focus #2 |
| 2026-06-15 | DONE | TOR-154 | C.LockedObjects interactable lock — nil-hole + startup-gate apply; author confirmed 70/70 |
| 2026-06-15 | UPDATE | RUNNING TASKLIST **Focus** | TOR-210 #1; TOR-202 #2; TOR-215 #3; TOR-154 Done |
| 2026-06-15 | DONE | TOR-178 | Seat ↔ stage figurine transfer — phases A–C (leaves visible when stage-bound); spotlight defer/park + homeland OFF fingerprint; author confirmed |
| 2026-06-15 | UPDATE | TOR-179 | Cleared `blockedBy` TOR-178; resurfaced Focus #3 |
| 2026-06-15 | UPDATE | RUNNING TASKLIST **Focus** | TOR-174 #1; TOR-173 #2; TOR-179 #3; TOR-178 Done this cycle |
| 2026-06-15 | DONE | TOR-174 | NPC token on ST dice bag → roll; restore home + STR.initiateFromBagLabel; author confirmed |
| 2026-06-15 | UPDATE | TOR-181 | Cleared `blockedBy` TOR-174; resurfaced Focus #3 |
| 2026-06-15 | UPDATE | RUNNING TASKLIST **Focus** | TOR-173 #1; TOR-179 #2; TOR-181 #3; TOR-174 Done this cycle |
| 2026-06-15 | DONE | TOR-173 | Stage placement lerp on Apply — anchor-family batching; author confirmed; commit `81d3710` |
| 2026-06-15 | UPDATE | RUNNING TASKLIST **Focus** | TOR-201 #1 (perf); TOR-181 #2; TOR-179 #3; TOR-173 Done this cycle |
| 2026-06-15 | DONE | TOR-201 | Gameboard frame hitch — author confirmed perf largely addressed |
| 2026-06-15 | DONE | TOR-181 | Retire Storyteller NPC toolbar panel — removed panel_npcs + refresh/dispatch paths |
| 2026-06-15 | UPDATE | RUNNING TASKLIST **Focus** | TOR-179 #1; dice E2E #2; TOR-96 #3; TOR-201/181 Done this cycle |
| 2026-06-15 | DONE | TOR-179 | Unified NPC seat figurine identity — author confirmed; duplicate audit clean |
| 2026-06-15 | UPDATE | RUNNING TASKLIST **Focus** | Dice E2E #1; TOR-96 #2; TOR-169 #3; TOR-179 Done this cycle |
| 2026-06-15 | UPDATE | TOR-162 | Re-homed to roll-conditions UI slice (UI & HUD, parent TOR-37, `module:conditions`); related TOR-209/TOR-54; off Dice E2E Focus |
| 2026-06-15 | UPDATE | TOR-209 | Related TOR-162; batch Opts + roll-panel condition display |
| 2026-06-15 | UPDATE | RUNNING TASKLIST **Focus** | TOR-96 #1; TOR-169 #2; TOR-172 #3; roll conditions slice deferred (TOR-162 + TOR-209) |
| 2026-06-17 | SHIPPED | _(create Linear — NPC figurine save-baked perf)_ | Runtime: no figurine spawn / no `setCustomObject`+`reload` on placement; `NPCS.auditPreloadPoolFigurines`; stripped `figurine.images` from `npcs_data`; `inject-npc-world-from-groups.js` + manifest registry gate; docs + Performance Audit §5 Done. Related TOR-219 (npc-groups upload). **Author:** run inject + Cloud upload on save before Save & Play. |
| 2026-06-21 | INBOX | 8 bullets promoted | TOR-220 (Snaps text color); TOR-221 (non-Host onLoad audit); TOR-222 (clock fast-forward); TOR-95 expanded (PC token controls); TOR-223 (seated scale 53); TOR-224 (ST panel reroll); TOR-225 (dice strip sort); TOR-226 (secret ST rolls) |
| 2026-06-21 | UPDATE | TOR-95 | INBOX scope — control board PC token seat row + sheet swap by tag; `blockedBy` TOR-180 |
| 2026-06-21 | UPDATE | TOR-144 | `blockedBy` TOR-221; Todo |
| 2026-06-21 | UPDATE | Linear relations | TOR-222 `blockedBy` TOR-142; TOR-223 `blockedBy` TOR-169; TOR-224 `blockedBy` TOR-218; TOR-225 `blockedBy` TOR-224; TOR-226 `blockedBy` TOR-224; TOR-95 `blockedBy` TOR-180; TOR-144 `blockedBy` TOR-221 |
| 2026-06-21 | DONE | TOR-220 | Snaps toggle — `textColor = "#FFFFFF"` on `Gameboard.syncControlBoardSnapsToggleLabel` |
| 2026-06-21 | UPDATE | RUNNING TASKLIST **Focus** | Back-burner/deferred cycle **paused** (author); inbox promotions in domain sections + Linear blockers only |
| 2026-06-21 | DONE | TOR-223 | Seated NPC figurine ImageScalar 53 at table seat; restore `npcs_data` `figurine.scale` off-seat; `applyFigurineImageScalarIfNeeded` skips `reload()` when already at target. `core/npcs.ttslua`; docs NPC Overview + Performance Audit §5. |
| 2026-06-21 | INBOX | 6 items | TOR-227 palette snap Z offset (shipped); TOR-228–231 Projects design/planning (External In Progress); TOR-232 Projects implementation (`blockedBy` TOR-228–231) |
| 2026-06-21 | DONE | TOR-227 | Palette parking snap Z offset — `D.CONTROL_BOARD_PALETTE_SNAP.parkingSnapLocalZOffset` 0.1; `lib/npc_control_board_palette.ttslua` |
| 2026-06-21 | CREATE | TOR-228–231 | Projects human-gate design issues (External In Progress, High, parent TOR-38) |
| 2026-06-21 | CREATE | TOR-232 | Projects system implementation (Backlog High; `blockedBy` TOR-228,229,230,231; related TOR-99, TOR-222) |
| 2026-06-21 | INBOX | 3 items | TOR-233 PCS tracker width (shipped); TOR-234 NPC spotlight Y seat→stage; TOR-235 workshop figurine backs |
| 2026-06-21 | DONE | TOR-233 | PCs panel — `pcs_track_damage`/`pcs_track_hum` 280px, panel width 680; `npm run build` OK |
| 2026-06-21 | CREATE | TOR-234 | Bug NPC spotlight Y seat→lit stage (High Todo; parent TOR-169) |
| 2026-06-21 | CREATE | TOR-235 | Workshop figurine back re-upload (`workshop-only`; parent TOR-43) |
| 2026-06-21 | UPDATE | RUNNING TASKLIST **Focus** | TOR-221 #1; TOR-234 #2; TOR-169 #3; TOR-83 #4 |
| 2026-06-23 | CREATE | TOR-236 | NPC vs PC control token contract (Todo High; parent TOR-169; related TOR-95, TOR-180) |
| 2026-06-23 | CREATE | TOR-237 | Control board Read/Lock/Load toolbar (Todo High; parent TOR-169) |
| 2026-06-23 | CREATE | TOR-238 | Hover token → stage figurine spotlight preview (Todo Medium; parent TOR-169; related TOR-172; not TOR-98 game phase) |
| 2026-06-23 | UPDATE | TOR-95 | `blockedBy` TOR-236; removed stale `blockedBy` TOR-180 (Done) |
| 2026-06-23 | UPDATE | TOR-144 | Removed stale `blockedBy` TOR-221 (Done) |
| 2026-06-23 | DONE | TOR-239 | Scene `conditions` import; deprecate `rollDefaults`; `reconcileHostedForSession` |
| 2026-06-23 | UPDATE | RUNNING TASKLIST | TOR-239 bullet Scenes Panel; TOR-85 reconcile API name |
| 2026-06-23 | DONE | TOR-162 | ST per-roll Opts modal persist/apply — author confirmed; commits `c5ed049`, `7989820`, `db0f2b4`, `0a5f839` |
| 2026-06-23 | DONE | TOR-209 | Roll panel active conditions display — batched with TOR-162 |
| 2026-06-23 | DONE | TOR-243 | Block scene/table layout while loose `d10` on table — author confirmed guard |
| 2026-06-23 | DONE | TOR-246 | ST POST_ROLL D/H/N pool modification on dashboard — commit `e60fab7` |
| 2026-06-23 | UPDATE | RUNNING TASKLIST **Focus** | Roll conditions slice (TOR-162 + TOR-209) moved to Done this cycle; added TOR-243, TOR-246 bullets |
| 2026-06-23 | INBOX | 6 items | Quick fixes TOR-240–242 (shipped); Active promotions TOR-244, TOR-245, TOR-247 |
| 2026-06-23 | DONE | TOR-240 | No Take Half player PRE_ROLL label — `core/roll_ui.ttslua` |
| 2026-06-23 | DONE | TOR-241 | Player dice spawn arc — `RING_STEP` 2→1.5 in `objects/dice_bag.ttslua` |
| 2026-06-23 | DONE | TOR-242 | CONTROL_BOARD seat row lower-left — `D.CONTROL_BOARD_SEAT_ROW` u/v |
| 2026-06-23 | CREATE | TOR-244 | Scene library selection preview + edit-before-apply (Todo Medium; parent TOR-33) |
| 2026-06-23 | CREATE | TOR-245 | Map pins last active location + timestamp (Todo Medium; parent TOR-37; related TOR-89) |
| 2026-06-23 | CREATE | TOR-247 | Rotational seat index layout (Todo Medium; parent TOR-35; related TOR-66) |
| 2026-06-23 | UPDATE | TOR-245 | `blockedBy` TOR-151 (default no-scene environment) |
| 2026-06-23 | UPDATE | RUNNING TASKLIST | TOR-240–242 Done bullets; TOR-244/245/247 domain bullets; Focus Also-in-cycle |
| 2026-06-23 | CREATE | TOR-248 | Multi-client TTS session workflow (External Todo, human-gate; parent TOR-141; blocks TOR-144) |
| 2026-06-23 | UPDATE | TOR-144 | `blockedBy` TOR-248; removed from Focus stack |
| 2026-06-23 | UPDATE | RUNNING TASKLIST **Focus** | #1 TOR-83, #2 TOR-236, #3 TOR-165; TOR-144 → Also in cycle |
| 2026-06-24 | CANCEL | TOR-248 | Same-PC multi-client not viable; superseded by friend + Steam invite on second machine |
| 2026-06-24 | CANCEL | TOR-11 | Phase 1 zones integration — scripting zones module removed |
| 2026-06-24 | UPDATE | TOR-144 | `removeBlockedBy` TOR-248; description = Preparing §1.5–§2; `living-doc` label |
| 2026-06-24 | CREATE | TOR-249 | Human gate: run initial multiclient session (Phases A–E); sub of TOR-144; External Todo |
| 2026-06-24 | COMMENT | TOR-7 | Module removed 2026-06; TOR-11 canceled |
| 2026-06-24 | UPDATE | RUNNING TASKLIST | TOR-144 unblocked; TOR-248/TOR-11 canceled bullets; TOR-249 human gate |
| 2026-06-25 | SHIP | Multiplayer audit W3-W5 | HUD_pcPanel/debugLight ST+host; remove GlobalReportBagDiceCount; drawer coroutine + csheet onLoad + GlobalPostRollModifyPool guards; Event Listener Policy HUD appendix |
| 2026-06-25 | DONE | TOR-105, TOR-183, TOR-216, TOR-217 | Reference-panel External issues closed (author); map panel left open (TOR-245, TOR-89) |
| 2026-06-25 | REOPEN | TOR-190, TOR-192, TOR-193 | Coterie infographics not part of reference-panel closure; TOR-190 parent of 192/193; detached from TOR-105 |
| 2026-06-25 | DONE | TOR-229, TOR-230 | Prince's Court reference panel + coterieData schema; `removeBlockedBy` TOR-232 ← TOR-229/230; commit `0b57677` |
| 2026-06-25 | INBOX | 2 items | Quick Fix TOR-251 promoted (ST normal grid + hunger offset); Active TOR-250 promoted (deactivated seat + import rules) |
| 2026-06-25 | CREATE | TOR-250 | Deactivated seat retention when NPC on stage + scene import dual-placement rules (Todo Medium; parent TOR-169; related TOR-178) |
| 2026-06-25 | CREATE | TOR-251 | ST normal pool grid labels include hunger offset (Todo Medium; parent TOR-31) |
| 2026-06-25 | UPDATE | RUNNING TASKLIST | TOR-250 NPC bullet; TOR-251 Dice bullet; Focus blurb dated 2026-06-25 |
| 2026-06-25 | DONE | TOR-251 | ST normal strip labels include hunger offset (`refreshStNormalStripLabels` in roll_ui.ttslua) |
| 2026-06-25 | SHIP | pc_control_token load invisibility | `TAG_PC_TOKEN` in `applyControlBoardComponentPlayerInvisibility` (npc_gameboard.ttslua) |
| 2026-06-25 | CREATE | TOR-252 | NPC roll broadcast wrong figurine for duplicate fullName (Todo Medium; parent TOR-31; related TOR-174/TOR-156) |
| 2026-06-25 | INBOX | `/tr-inbox` complete | 3 Quick Fixes + 1 Active triaged; INBOX cleared |
| 2026-06-25 | DONE | TOR-83 | Scenes site modal overlap — buckets now flowing `<VerticalLayout>` (not stretched `<Panel>`); Focus #1 closed, re-stacked TOR-236/TOR-165 |
| 2026-06-25 | DONE | TOR-236 | npc vs pc control-token contract — Apply-time PC seat activate/deactivate, NPC-only palette/preload (`D.getNpcCharacters()`), handler matrix; commits `c975ce1`/`0a5550b`/`7c1ebd5`; Focus #1 closed |
| 2026-06-25 | UPDATE | TOR-95, TOR-247 | TOR-95 `blockedBy` TOR-247 (was TOR-236); TOR-247 scope note for PC-token sole authority + unblocks play-as-NPC |
| 2026-06-25 | UPDATE | RUNNING TASKLIST | TOR-236 `[x]`; Focus re-stacked TOR-165 #1; TOR-95 blockedBy TOR-247 |
| 2026-06-25 | NOTE | TOR-236 | Author workshop prep resolved (orphan PC npc_tokens deleted; pc_control_token + pcToken GM Notes); TOR-247/TOR-95 remain open for seat rotation + play-as-NPC |
| 2026-06-25 | NOTE | TOR-236 | Author confirmed Apply-time PC seat activate/deactivate works in-game |
| 2026-06-25 | UPDATE | TOR-152 | Augmented scope: Control Board sync on scene load must also reconcile `pc_control_token` flips to `seatSlots[color].isPresent` (not just NPC tokens); `relatedTo` TOR-236/TOR-237; reconcile pin exists (TOR-236), TOR-152 ensures it runs on load path |
| 2026-06-25 | DOC | TOR-141 | E2E: Scenes Suite D2 + `gbE2eVerifyPcTokens` harness (reload + scene Apply PC token mirror); Gameboard reload/scene_apply gates extended |
| 2026-06-25 | DONE | TOR-165 | WP reroll wave partial settle — author verified Save & Play; commits dd6707e + cd6067e |
| 2026-06-25 | UPDATE | RUNNING TASKLIST | Focus re-stacked: #1 TOR-252 (NPC broadcast figurine), #2 TOR-151→152, #3 TOR-237 |
| 2026-06-25 | FOLLOW-UP | TOR-236 | PC control token dropped on ST Normal/Hunger dice bag → Standard roll for that PC (PCs-panel parity); any bag returns token to its column home + flip (`tryPcControlTokenDroppedOnStorytellerDiceBag` / `GlobalGameboardPcTokenDroppedOnDiceBag`) |
| 2026-06-25 | DONE | TOR-253 | Dice spawn-arc overflow layering: cap 10/arc, extras on higher (+2 y) + slightly-larger concentric arcs (`objects/dice_bag.ttslua` `worldArcPoint`); relatedTo TOR-241 |
| 2026-06-25 | DONE | TOR-252 | NPC roll broadcast figurine for duplicate fullName — `resolveRollFigureAssetKey` now prefers authoritative `npcCharacterKey` carried on active roll → history (`RC.initiateRoll` config → `STR.initiateNpcRoll`/`initiateFromBagLabel` → control-token-on-bag passes `characterKey`); display-name lookup retained for free-text bag modal. `core/roll_ui.ttslua`, `core/roll_controller.ttslua`, `core/storyteller_rolls.ttslua`, `core/npc_gameboard.ttslua`; solo-verifiable, no multiclient path |
| 2026-06-25 | UPDATE | RUNNING TASKLIST | TOR-252 `[x]`; Focus re-stacked #1 TOR-151→152, #2 TOR-237 |
| 2026-06-25 | FIX | (ST dice arcs) | Werewolf-roll spawn geometry: Rage dice → Hunger (inner) arc, Werewolf → Normal (outer) arc (`radiusForSpawnKind` maps `KIND_RAGE`/`KIND_WEREWOLF`); ST drawer arcs cap at 7 dice/arc (`MAX_DICE_PER_ARC_ST`) vs player 10; removed dead legacy Rage `HUNGER_RADIUS_SCALE` path. `objects/dice_bag.ttslua`; relatedTo TOR-253 |
| 2026-06-25 | DONE | TOR-151 | Default no-scene environment — `Scenes.applyDefaultNoSceneEnvironment` (Table B1, 5 PCs, empty NPC world, OutdoorDim, Main-only soundscape, random skybox, overlay blank clock/weather); `endSceneNarrative` converged; map pins hidden when no live scene (`SceneLibrary.hasLiveSceneOnTable`) |
| 2026-06-25 | DONE | TOR-152 | Play load / Start→Play restore — `Scenes.reconcilePlaySessionOnEnter` on startup gate + `M.advancePhase`; `restoreActiveSceneWorld` / `applyActiveSceneSoundscapeFromSession`; solo-verifiable; multiclient unverified |
| 2026-06-25 | UPDATE | RUNNING TASKLIST | TOR-151/152 `[x]`; Focus #1 TOR-237 |

See `.dev/DEVELOPMENT_WORKFLOW.md` § Linear synchronization, § Inbox capture & triage, and § Focus & backlog prioritization — diff RUNNING TASKLIST against Linear monthly or before releases; run **“process the inbox”** when Active or unanswered **Needs clarification** items pile up; re-stack **Focus** before play sessions or ~weekly.
