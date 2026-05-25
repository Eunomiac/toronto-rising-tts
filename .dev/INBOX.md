# Inbox

## Active

- in the player-facing roll panel, dots representing dice added to the pool are no longer color coded
  - normal dice should be white
  - hunger dice should be red
  - rouse dice should be dark red, and should be offset slightly to the left of the main dice readout
    - this is true for all rouse pools: if a blood surge is also triggered (which allows a second rouse check to be incorporated into the roll, since blood surges never roll more than one die), it should be offset from any other rouse check rolls included
  - obliv-rouse dice should be dark purple
  - werewolf dice should be yellow-green
  - rage dice should be orange
- when a player "Takes Half", the broadcast display should depict dice images _as if_ the player rolled their full pool except all dice were Normal Dice, and half of the dice (rounded down) scored a single success, while the rest are displayed blank
- remove excess verbiage from roll result broadcast: no die roll numbers (the images are enough)
- as with the roll panel indication of dice pool describe above, roll result images of rouse check(s) should be offset from each other, and from the dice pool proper
- fade-in of weather audio is very abrupt, possibly because a cross-fade attempt is occurring when the system is under heavy load, resulting in the fade being delayed and jumping to max volume instantly; this _may_ be solved naturally by TOR-147 (which separates fade-outs into an earlier part of scene transition, which might result in smoother fade-ins later in the process)


---

## Needs clarification

### Unclear Bugs

### Unclear Intents

### Unclear Ideas

---

## Processed

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
