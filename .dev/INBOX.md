# Inbox

## Active

- CRITUCAL: We need an urgent audit of all event listeners that frequently trigger in cases where they are not required to do anything (e.g. dropping NPC tokens on the control board). We need to figure out how to make these listeners as "single-operation check" capable as possible -- by which I mean, a single lookup, a single calculation, a single access is all the listener function needs to perform to return early and avoid causing unnecessary slowdowns during unrelated game events. Then, we need clear policies in place to ensure this remains the standard for all future such listeners. Place at top of focus stack.
- Upon hitting "Apply", NPC tokens on the Control Board in seated positions (i.e. the lower row of snap points) should be scaled up by a factor of 2. This scaling should be revered whenever the token is moved off of one of the seated position snap points, returning it to normal size for NPC tokens
- snap points for seated positions are still resulting in a y-rotation of 180 degrees; y-rotation should be zero.
- "Clear", as well as dropping NPC tokens, has become quite laggy. We need to explore aggressive methods of reducing the load when these events are triggered -- memoization, as much pre-calculation as possible, etc, etc
- when switching to a different table from Table A in the Scenes panel, the Table A model on the Control Board remained in place, with the new table's model (Table B) overlayed on top of it. Expected Behavior: There should only ever be one table model on the control board -- the table model corresponding to the table currently in use.
- rules change that likely applies to certain dice/roll functions -- players cannot voluntarily rouse the blood when they are at Hunger 5. Thus, initiating Blood Surge should be locked out, as should interactions iwth Oblivion-Rouse bags. Players should still be able to initiate standard rouse checks, as they can be forced to rouse the blood in certain situations. (When a vampire fails a rouse check at Hunger 5, they must immediately roll to resist hunger frenzy against a Difficulty of 4.)
- new feature (quick to implement): a deck of Compulsions for players to randomly choose from when they suffer a Bestial Failure. The cards themselves will be indistinct; only when a player draws one will script dynamically change the card image to the corresponding card for that specific player. Players can drop Compulsions once drawn; they will immediately lerp-animate and lock to a visible position by their character sheet.
- new feature: discipline card storage -- players have large hands of cards, one for each discipline power, ritual or ceremony. players can drop cards in their hand to a zone near their character sheet, in which a grimoire-looking object hosts page navigation buttons which move stored cards onto facing pages so they can be read without occupying hand space
- new feature: resonance type & temperament (intensity) after hunting rolls
  - a single function will accept the resonance modifiers on the location, the resonance the player desires, and the result of their hunt roll; it will return a table containing the percentage chance of finding each type, at each of the three intensity levels
  - using this function's return value, we need to devise an engaging means of displaying the resulting odds to the table, as well as simulating the random selection of the resonance itself -- perhaps spotlights rove over a map, their color shifting to represent resonance types, before slowing and stopping; or a meter with a swinging arrow, where the meter's colors shift to reflect the odds, and the arrow lands on the resonance chosen; or, we could use a bag of multicolored gems, and add a certain number of each type before asking the player to choose one at random (I have some pretty gems we could use for thsi)
  - related feature: use LLMs to generate a large number of simply-defined victims for each type and intensity of resonance. include name, age, appearance, some roleplay tips, some optional details the player might "sense" in their blood, all exemplifying the resonance type represented; these could easily be made into a deck of cards, with the numbers of victims corresponding to each type and intensity changing to reflect the odds
- devise list of generic NPCs players are likely to encounter during play (don't forget Memoriams)
- create Storyteller reference of stats and abilities you can draw from while improvising encounters
  - get rough spreads of pool sizes; when you use one during play, write it down to lock in that stat for that character
- player roll panel should display active roll conditions; conditions will need to provide a readable name in their config


---

## Needs clarification

### Unclear Bugs

### Unclear Intents

### Unclear Ideas

---

## Processed

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
