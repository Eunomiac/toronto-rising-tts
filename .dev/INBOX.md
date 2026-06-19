# Inbox

## Quick Fixes
> Note to Agent processing the Inbox: For each bullet point listed in this section, check to see whether the fix is simple enough to do right now rather than logging it to Linear. You have full permission to implement and commit a fix to any of these bullets to the repo, assuming they actually _are_ quick fixes. If they are more complex than that, log them to Linear as with the bullets in the "Active" header, below.

- [Control Board] [Quick Fix] When updating the "Snaps" button to toggle it on/off, the text color must be reset to #FFFFFF (TTS reverts the text color to black on any update of attributes)

## Active

- IMPORTANT: All testing has been done in single-player environments, with myself logged in as Host. We need to check how TTS runs scripts when non-Host clients connect -- do they run the same onLoad functions? If so, we need to exit those functions early whenever they would perform functions that are Host/Storyteller only (such as syncing the NPC stage, moving objects, setting up objects, etc)
- [Clock/Time] Need a way to "fast forward" time in an animated fashion, lerping with a slow acceleration towards a date with an eased slow down on approach. Clock should update each frame, speeding up and slowing down as the game takes a time jump into the future/past.
- [Control Board] Implement PC token controls: Activate/Deactivate seats, allow play as another NPC
  - When adopting the role of another NPC, a check should be performed for a matching character sheet object (searched by tag), and replace the player's normal sheet with the NPC's
- [Seated NPCs] When an NPC figurine is seated at the table, its model scale should be set to `53`, and restored to the scale defined in `npcs_data.tts` when they are moved out of a seat (either to the stage or to the preload area)
- [Storyteller Roll Control Panel] Rerolling dice for spending willpower needs to be redesigned so it can be done from the panel itself:
  - Once a Storyteller roll has completed and results are presented on the Storyteller roll control panel, dice images should be clickable: A single-click highlights (via `outline`) the die, another click removes the highlight.
  - If any dice are highlighted, a "Reroll" button should appear at the bottom of the panel. When clicked, all currently-highlighted dice in the panel are randomized again on the board (while all other dice remain locked). This might require adding an index to the GM notes of each die, or recording their GUIDs, so the control panel dice images can be mapped to their object counterparts.
  - There should be zero restrictions placed on Storyteller rerolls: They can reroll multiple times (until they click "Confirm"), they can reroll hunger dice, they can reroll more than three dice.
- [Dice Display Strips] Whenever dice results are displayed (player roll control panel, storyteller roll control panel, or roll result broadcast panel), the dice must be presented in the correct order:
  - Rouse/Oblivion-Rouse Checks -> Obliv Fang+Stain -> Obliv Stain -> Obliv/Rouse Fang -> Obliv/Rouse Blank
  - Standard Rolls: Hunger Crits -> Normal Crits -> Hunger Successes -> Normal Successes -> Hunger Blanks -> Normal Blanks -> Hunger Skull
  - Werewolf Rolls: Rage Crits -> Werewolf Crits -> Rage Successes -> Werewolf Successes -> Rage Blanks -> Werewolf Blanks -> Rage Jaws
      ... HOWEVER, if the result is a Brutal Outcome (i.e. the Storyteller "Confirms Violence"), then in the result broadcast panel, all Rage Jaws dice should be moved to the front of the line, before the Rage Crits
  - In all of the above cases, no spacing should be added between groups of dice
  - Rouse Checks and Oblivion Rouse checks are fine as they are
- [Secret Storyteller Rolls] If the Storyteller _right_-clicks on the "Roll" button on the Storyteller Control Panel, the following changes should occur in the roll process: 0.5s after the dice are randomized above the player table, they should immediately be hidden via setInvisibleTo to all player colors. Otherwise, there should be no change to how the dice and dice tray are handled (i.e. they should all still remain on the table, until the Storyteller "clears" the roll.)
- [Secret Storyteller Rolls] If the Storyteller _right_-clicks on the "Confirm" or "Take Half" button on the Storyteller Control Panel, no results should be broadcast.
- [Secret Storyteller Rolls] Adjacent to the "Clear" button on the main Roll Control dashboard should be a "Broadcast" button, which will broadcast the results of the roll when clicked.

---

## Needs clarification

### Unclear Bugs

### Unclear Intents

### Unclear Ideas

---

## Processed

- 2026-06-15 [bug] Stage→seat pooled spotlight left at stage pose — `parkPooledSpotlightForSeatedNpc` on seat identity (preload slot, OFF, hidden, cancel deferred align)
- 2026-06-15 [bug] Stage NPC pooled spotlight Y misaligned until token light toggle — defer light align until figurine bounds ready after `image_scalar`/`reload()` (`deferNpcSpotlightAlignedToFigurine`)
- 2026-06-15 TOR-84/85/79 Done; TOR-88 Canceled (PC tokens). Quick-fix batch: TOR-78,80,82,94,137,146,148,150,153,203 shipped; TOR-152+147 deferred with TOR-151 epic.
- 2026-06-15 TOR-211 — [workshop] Set up player seat lights for famulus models
- 2026-06-15 TOR-212 — [workshop] Famulus figurines/lights Brown & Red — rotate with hand zone (like Pink Tarot)
- 2026-06-15 TOR-213 — [workshop] Remove roll-sequence player light intensity boost
- 2026-06-15 TOR-214 — [dice] Oblivion Rouse Hunger/Stain prompt + broadcast copy
- 2026-06-15 TOR-215 — [bug] Seated NPC figurine scale resets on control board refresh
- 2026-06-15 TOR-210 — [bug] Apply + seat/table snap does not seat NPC at table
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
