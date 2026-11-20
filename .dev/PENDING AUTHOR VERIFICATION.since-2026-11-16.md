# Pending Author Verification — since 2026-11-16

Filtered slice of [PENDING AUTHOR VERIFICATION.md](PENDING%20AUTHOR%20VERIFICATION.md).

**Filter rule:** keep only Outstanding rows whose `####` header was first added in a commit on or after **2026-11-16** (matched via `git blame` on those headers and the shipping commits that introduced them). Older backlog rows from before that date are omitted.

**Included (8 rows):** TOR-796, TOR-795, TOR-794, TOR-792, TOR-791, TOR-790, TOR-789, TOR-788.

**Not listed here:** Dashboard-only pin work from the same day (pin 8 stage NPC right-click → roster config; pin 9 NPC-drop difficulty strip) — those never got PAV rows. Everything else still Outstanding in the full checklist was first added before 2026-11-16.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Author Comment:**) |
| **⚠️** | Author | Bad expectations (+ **Author Comment:**) |
| **⏰** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |
| **🚫** | Author | Irrelevant or obsolete |

**Agent-assessment marks** (these follow any Author mark on the `####` header):

| Mark | Meaning |
| --- | --- |
| **🟢** | An agent can definitely validate this through deterministic gateway, state, object, UI-attribute, trace, or output checks. |
| **🔵** | An agent can test this well enough for this private hobby project and validate it with practical confidence, though the evidence is not absolute. |
| **🟡** | An agent can reduce the uncertainty, but an important human sensory or real-client check remains; the note under the header says exactly what you still need to validate. |
| **🔴** | The check is entirely human; the note under the header explains why and what you need to do. |

Unmarked = shipped and waiting for your first pass. Full agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING%20AUTHOR%20VERIFICATION.agent.md).

---

## Outstanding (on or after 2026-11-16)

#### 🟡 TOR-796 — Deck of Complications public web app

> **Agent-assessment note:** Create-room API smoke-tested on the live Worker. Full play + Apply-to-roll still needs your Dashboard and Save & Play pass.

**How to verify:** Restart the Storyteller Dashboard (so it picks up `COMPLICATIONS_API_URL` / `COMPLICATIONS_HOST_SECRET`). Save & Play. On an eligible failed PC roll, click **Play Deck of Complications**. Confirm the Storyteller board opens and the player join link is copied. On a phone or second browser, open the player link, flip cards, then Stop; on the Storyteller board Confirm End. Back on the Dashboard, click **Apply Complications result** and confirm the roll margin updates. Optionally open https://toronto-rising-complications.toronto-rising-player-map.workers.dev/solo for solo practice without a room. Physical decks should still be usable for one-off draws; the old TTS board deal should refuse unless `complicationsUseTtsBoard` is set.

#### 🟡 TOR-795 — END / INTERMISSION stage XP award controls

> **Agent-assessment note:** Typecheck passed for the IdleBoard panel. Live XP log writes and disconnected greying need Save & Play.

**How to verify:** Restart the Storyteller Dashboard, then Save & Play. With no scene on the table in End, the XP panel should sit in the stage centre with reminders on the left. Try Session attendance, End of Story, and a greyed-out disconnected seat on Promoted Team Play. In Intermission, award Provided Feedback to a seat (including a disconnected one).

#### 🟡 TOR-794 — Scatter group title field on Dashboard and player HUD strip

> **Agent-assessment note:** Vitest covers draft summary storage. Live HUD text and scene persistence need Save & Play.

**How to verify:** Restart the Storyteller Dashboard, then Save & Play. In a Scatter scene, type a short title under a group circle and press Enter (or leave the field). Open the player Scatter strip — that group's column should show the title under the NPC list. Save the scene, reload it later, and confirm the title is still there.

#### 🟡 TOR-792 — Right-click Roll after left-click should auto-toss sitting dice

> **Agent-assessment note:** Host can confirm ROLLING + right-click calls randomize; live tray toss still needs Save & Play.

**How to verify:** Save & Play. Start a PC roll, left-click Roll so the dice sit on the tray, then right-click Roll — every die should toss as if the first click had been a right-click.

#### 🟡 TOR-791 — Scatter Clear Stage leaves NPC figurines in the world

> **Agent-assessment note:** Host can confirm Sync.npcs after scatter clear and that GUIDs leave the object list; visual clear still needs Save & Play.

**How to verify:** Save & Play. In a Scatter scene with several NPCs on stage, use Clear Stage (confirm if asked). Their figurines and lights should leave the table; any NPCs you leave in a group should stay posed.

#### 🟡 TOR-790 — Pink Tarot right-click consult: shuffle, draw, flip face-up

> **Agent-assessment note:** Host can confirm Global consult logs and that a loose card sits on the deck; face-up orientation and feel still need Save & Play.

**How to verify:** Save & Play. As Pink (or Host as Black): left-click still shows/hides the Tarot set, and hide returns loose cards to the deck. Right-click while hidden should reveal, shuffle, and leave one face-up card on the deck. Right-click again while shown should scoop, reshuffle, and draw a new face-up card.

#### 🟡 TOR-789 — Scene transitions scramble Discipline hands across seats

> **Agent-assessment note:** Host can confirm stash/deal traces and hand membership tags; live multi-seat Apply with distinct hands still needs a human check when the cover lifts.

**How to verify:** Save & Play. Give each connected PC a distinct Discipline hand. Apply a different scene or table (or Advance through a transition that reseats). When the cover lifts, each player should still hold only their own cards — without using Reset Discipline Hands.

#### 🟡 TOR-788 — Intermission→Play leaves clients on the wrong default camera

> **Agent-assessment note:** Host can confirm the snap call and seat `cameraAngles` after Play enter; connected-client lookAt still needs a live multiplayer check.

**How to verify:** Save & Play. With at least two connected clients on a random-seating table, Advance from Intermission into Play. When the splash finishes and the cover lifts, each player's view should already match their own seat — without clicking the camera icon. Clicking the bottom-right camera icon afterward should not jump them to a different spot.
