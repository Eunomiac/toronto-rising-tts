# Inbox

## Active

### Changes to Dice/Rolling — shipped (session; not on Linear)
- [x] Roll-phase instruction after Roll click: **"Roll Your Dice!"** (`core/roll_ui.ttslua`)
- [x] `rollControl_resultDisplay_*` single string (headline + signed margin); margin element removed from Lua (`panelResultDisplayText`)
- [x] Preloaded pool dice spawn on **open** (`RC.openRoll` → `GlobalSpawnActivePoolDiceForActive`) and **skipSetup initiate** (Remorse, etc.); spawn helpers allow SETUP + PRE_ROLL
- [x] Drawer **y > 2.5** gate before `releaseDice` (`GlobalWaitDrawerThenReleaseBagDice` + `DiceDrawer.getPositionY`)
- [x] **SETUP** pool build: Normal/Rouse/Obliv bag clicks; hunger bag visible in SETUP + PRE_ROLL; ROLL visible but disabled until ST **Open**; Hunger bag always toggles **Blood Surge** (same in SETUP and PRE_ROLL)
- [x] POST_ROLL **Confirm** always player-held baton → immediate `confirmRoll` / broadcast (no ST re-confirm)
- [x] SETUP instruction shortened to **"Continue Assembling — Awaiting Storyteller"**; **ROLL** button grey when visible but disabled (`roll_ui.ttslua`)
- [x] `rollControl_resultDisplay_*`: Total / Bestial / Total Bestial Failure re-apply `rectAlignment = "MiddleCenter"` after class change (`roll_ui.ttslua`)
- [x] Dice tray opens whenever active pool has staged dice after spawn (ST **Open**, auto-spawn, bag hook — incl. pre-filled Remorse pool)

---

## Needs clarification

### Unclear Bugs

### Unclear Intents

### Unclear Ideas

---

## Processed

- 2026-06-06 TOR-197 — [agent] Event listener early-return audit + policy (Focus #1)
- 2026-06-06 TOR-198 — [bug] Rouse check Roll doubles staged dice pool (Focus #2)
- 2026-06-06 TOR-199 — [NPC gameboard] Seated snap row token 2× scale on Apply
- 2026-06-06 TOR-200 — [bug] Seat-assignment snap points 180° Y rotation
- 2026-06-06 TOR-201 — [NPC gameboard] Reduce Clear / token-drop lag (`blockedBy` TOR-197)
- 2026-06-06 TOR-202 — [bug] Duplicate table models on control board after table switch
- 2026-06-06 TOR-203 — [dice] Hunger 5 lock voluntary rouse — Blood Surge + Obliv-Rouse
- 2026-06-06 TOR-204 — [feature] Compulsions deck on Bestial Failure (quick win)
- 2026-06-06 TOR-205 — [feature] Discipline card grimoire storage zone
- 2026-06-06 TOR-206 — [feature] Resonance type & temperament after hunting rolls
- 2026-06-06 TOR-207 — [chronicle] Generic encounter NPC list incl. Memoriams (`workshop-only`)
- 2026-06-06 TOR-208 — [chronicle] ST improv stats & abilities reference (`workshop-only`)
- 2026-06-06 TOR-209 — [UI] Roll panel show active roll conditions
- 2026-06-04 TOR-180 — [feature] Control board seat-assignment snap row (INBOX Feature 2; blocks TOR-178; Focus #2)
- 2026-06-04 TOR-181 — [improvement] Retire Storyteller toolbar NPC panel (umbrella note; deferred after TOR-180/TOR-174)
- 2026-06-04 duplicate — NPC token on ST dice bag roll + return (INBOX Feature 1 → **TOR-174**)
- 2026-06-04 shipped — anchor spread palette `defaultLightMode` for siblings (TOR-172 follow-up; code in `tryAnchorFamilyGroupSpread`)
- 2026-06-04 TOR-179 — [bug] Workshop SEAT_FIGURE anchor ID without name/nickname (tooltips vs layout anchors; not duplicate of TOR-177)
- 2026-06-04 duplicate — Pink Tarot hide leaves drawn card on table → existing **TOR-96** (Tarot hide returns cards)
- 2026-06-03 TOR-178 — [feature] Seat ↔ stage figurine transfer (retain seat on Clear; scale/seatedScale; phase A shipped — table leaves on stage still TODO phase C)
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
- 2026-05-25 TOR-143 — [feature] Phase system redesign — primary phases, Play sub-phases, session lifecycle, theme/Spotlight audio (supersedes TOR-90)
- 2026-05-25 TOR-94 — duplicate — auto seat assignment on connect (already scheduled)
- 2026-05-25 TOR-144 — [QA] Multiplayer E2E playbook (sub-issue of TOR-141)
- 2026-05-25 TOR-145 — [bug] End scene — library live/mirroring label + cleared location written back
- 2026-05-25 TOR-146 — [bug] Delete active library scene should end live scene first
- 2026-05-25 TOR-147 — [improvement] Soundscape BGM/location/weather fade on blindfold down (expanded weather policy)
- 2026-05-25 → Needs clarification — Real-time clock speed faster than multiplier (intermittent)
- 2026-05-25 TOR-148 — [bug] Real-time narrative clock runs faster than speed multiplier (+ uncleared interval hypothesis)
- 2026-05-25 TOR-149 — [bug] Storyteller dice tray lights ON during global light modes
- 2026-05-25 TOR-150 — [bug] Thunder one-shots bypass indoor weather ducking
- 2026-05-25 TOR-151 — [feature] Default "no scene" environment when no active library scene
- 2026-05-25 TOR-152 — [feature] Restore active scene on Play load and Start→Play transition
- 2026-05-25 TOR-153 — [bug] Map pins stale offset + unmappable-scene active-only hide
- 2026-05-25 TOR-154 — [bug] THE_FLOOR / TABLE_PLINTH interactable despite LockedObjects
- 2026-05-25 TOR-155 — [bug] Roll panel pool dots lost color coding
- 2026-05-25 TOR-156 — [UI] Roll result broadcast trim verbiage + rouse strip layout
- 2026-05-25 TOR-147 — related — Weather fade-in abrupt under load (may resolve with blindfold fade work)
- 2026-05-25 TOR-73 — expanded — Take Half broadcast synthetic dice display (scope added)
- 2026-05-25 TOR-157 — [feature] Pre-transition seat presence modal on scene Apply
- 2026-05-25 TOR-158 — [bug] Blood Surge ignores conditions affecting Blood Potency
- 2026-05-25 TOR-159 — [bug] Frenzy triggers at hunger 5 instead of only when rising past cap
- 2026-05-26 Dice-E2E pass — TOR-161 (normal bag right-click), TOR-162 (ST Opts stick), TOR-163 (no-difficulty broadcast), TOR-164 (playbook + rollTest harness 😀); reaffirmed TOR-155/156/73 via E2E markers
- 2026-05-27 duplicate — no-difficulty roll broadcast → TOR-163 (already in Focus + tasklist from Dice-E2E 2026-05-26)
- 2026-05-27 TOR-166 — canceled — widen Far Left / Far Right NPC stage area angles superseded by TOR-169 (Storyteller gameboard); Linear Canceled, tasklist `[x]`
- 2026-05-27 TOR-167 — canceled — Mid-Center / Far-Center NPC stage areas superseded by TOR-169; Linear Canceled, tasklist `[x]`
- 2026-06-02 TOR-174 — [feature] NPC control token on ST dice bag initiates roll + return to board/palette (deferred — dice cycle; `blockedBy` TOR-169; child of TOR-79)
- 2026-06-02 TOR-172 — [feature] `snapGroups.defaultLightMode` on palette drop only (Done)
- 2026-06-02 TOR-171 — [improvement] Figurine yaw from master origin; ignore token Y rotation (Done)
- 2026-06-02 TOR-170 — [bug] Control board tokens missing on load with on-stage figurines (Done)
- 2026-06-02 TOR-173 — [feature] Lerp on Apply-only stage moves — scope expanded (blindfold gate, simultaneous, back/power eases, light timing; Focus #4)
- 2026-06-02 TOR-177 — [bug] Duplicate SEAT_FIGURE when NPC seated on scene activate (Done)
- 2026-06-02 TOR-176 — [bug] Control board XmlUI visible to non-Host players (Done)
- 2026-06-02 TOR-175 — [bug] Anchor family spread slot order from center snap (Done)
