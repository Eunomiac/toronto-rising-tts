# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Linear **Done** alone does not mean verified.

**Marks for agents** (prefix the `####` header): **✅** confirmed · **❌** still broken (+ **Verification Failures:** / optional **Verified:**) · **⚠️** bad expectations (+ **Corrections:**). Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING%20AUTHOR%20VERIFICATION.agent.md).

---

## Outstanding

_Last populated: 2026-08-06 — PAVE pass: author ✅ TOR-423 / TOR-473; TOR-476 expected timing corrected (district/site card reveal)._

### High — session / join / first-load

#### ❌ TOR-476 — Scene transition audio crossfade (aligned with district/site cards)

**How to verify (remaining):** Save & Play. Apply a library scene with music/ambience. As the destination District and Site cards fade in on the blindfold, the audio should crossfade with them — old scene fading out, new scene fading in — even when a transition has no district/site cards (for example End Scene). When the blindfold rises, the new scene should already be at full volume with no silent stretch after the lift.

**Context:** Follow-up to TOR-469. Lead-in / camera may be fine. Author ❌: new audio started several seconds after blindfold rise. Author correction (2026-08-06): cue the audio change to the district/site card reveal (or the same timing window when those cards are absent), not merely “sometime under the blindfold before lift.”

**Verification Failures:** New-scene audio fade-in begins several seconds after the blindfold has risen; stretches of silence. Expected: crossfade timed with district/site card FadeIn (or equivalent window on End / no-card transitions); full volume before lift.

#### TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped).

**How to verify:** Run the multiclient control/treatment playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step%20Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Especially watch **step 2 (HUD / Refresh UI)** after the **TOR-444** remount-weight reduction: does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) full-HUD join to see whether the Arm pipeline is still needed at all.

**Context:** Earlier run: Assets, Emitters, and Figurines restore steps succeeded; step 2 timed out and drove **TOR-444**.

---

### Scenes / clock follow-ups (from TOR-222 / TOR-402 verify)

#### TOR-478 — Skybox-only Apply brief blindfold

**How to verify:** On the Scenes panel, change only the skybox and press Apply Location. The global blindfold should come down immediately, finish its fade-in, apply the skybox, hold about two seconds of active blindfold, then lift. District/Site should still not be required for skybox-only Apply (that part of TOR-402 already works).

**Context:** Promoted from ⚠️ Corrections on TOR-402.

#### TOR-472 — Dusk/Dawn stay on the same night

**How to verify:** On Scene Time, use the Dusk/Dawn buttons. The clock should always land on the same night (dusk-to-dawn block). Crossing midnight may change the calendar date, but the lerp must not animate through daytime hours. Minutes/Hours/Days/Weeks/Months grids already passed under TOR-222.

#### TOR-477 — Years Go delta / right-click rewind

**How to verify:** On Scene Time Years: enter `1996` and Go (absolute year → dusk that date). Enter `554` with year 2026 — left-click Go → dusk in 2580; right-click Go → dusk in 1472. Enter `-554` — both clicks → dusk in 1472 (right-click must not flip the sign).

#### ❌ TOR-394 → follow-up **TOR-479** — Debug last-load clock still missing

**How to verify:** Load the save, open the DEBUG / admin controls panel. Between `== DEBUG ==` and `Overlay Alpha: Full` there should be a centered, slightly smaller `HH:MM AM/PM` load time. If it is still missing after Save & Play of the current scripts, leave ❌ and note what you see.

**Context:** Original TOR-394 / TOR-406 shipped; author still sees no label. Remaining work: **TOR-479**.

**Verification Failures:** No time text beneath `== DEBUG ==`; Overlay Alpha sits immediately under the header.

---

### Quick Fixes this inbox (Done — need Save & Play)

#### TOR-483 — CSHEET right-click uses clicked seat’s dice tray

**How to verify:** Save & Play. From your seat, left-click another player’s sheet inner-edge control — camera should go to **their** sheet. Right-click the same control — camera should go to **their** dice tray, not yours.

**Context:** Amends TOR-460 (which previously aimed the clicker’s own tray).

#### TOR-480 — Set present-day refreshes Day/Year/Time green tint

**How to verify:** On Scenes → Scene Time, change Day/Year/Time so the fields look blue or grey, then click **Set**. Those three fields should switch to present-day green.

---

## Cleared

_Optionally park confirmed entries here briefly, or just delete them. Prefer delete plus a tasklist / Linear note._

_(empty)_
