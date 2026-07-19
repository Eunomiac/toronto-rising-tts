# Control Board HERE/THERE verification _(TOR-417)_

## Agent Routing

Read this when:
- signing off the Control Board preview editor or one-shot Lock merge
- checking HERE/THERE after a Save & Play

Source of truth:
- `core/control_board_preview.ttslua`
- `core/npc_gameboard.ttslua`
- `.dev/E2E Playbooks/Scenes-E2E.md` Suite N

Verification:
- Gameboard Suite B prints no `FAIL`
- Scenes Suite N completes every human gate and prints its final Lock PASS

Verify that THERE edits persist without changing the live scene, commit at every exit/apply boundary, and that Lock merges live participants over one destination scene before auto-unlocking.

## Prerequisites

- **Save & Play** from the current repository.
- **Host** connected (solo is fine).

## What Code Block 0 automates

- Runs the Gameboard full suite, including pure draft/merge assertions and HERE reconcile behavior.
- The Scenes fixture block creates rows 17 and 18 and resets their participant data.

## Run order

**Step 1.** **Save & Play.**

**Step 2.** Execute Lua Code — Code Block 0. Wait for the Gameboard suite to finish with no `FAIL`.

**Step 3.** Execute Lua Code — Code Block A. Wait for the Scenes fixture setup PASS.

**Step 4.** Execute Lua Code — Code Block B.

**Step 5.** At each on-screen `HUMAN` instruction, perform exactly the requested Control Board or Scenes Panel action, then click **Continue** in RunTest.

**Step 6.** Stop when the console prints `PASS - one-shot Lock auto-unlocked` and RunTest reports completion.

---

## Code Block 0 — Automated Gameboard domain and reconcile checks

```lua
RunTest("Gameboard", "B")
```

---

## Code Block A — Scenes fixture setup

```lua
RunTest("Scenes", "0")
```

---

## Code Block B — HERE/THERE and Lock interaction gates

```lua
RunTest("Scenes", "N")
```
