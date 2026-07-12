# Multiplayer session investigation (2026-07-12)

## Agent Routing

Read this when:
- diagnosing TTS join timeouts or Hunger 5 overlay behavior on join clients
- triaging INBOX Performance Issues related to multiplayer

Source of truth:
- this report (findings + recommendations)
- code paths cited below
- [Preparing For Multiplayer](./Preparing%20For%20Multiplayer.md) §1 (P1–P10)
- [Multiplayer-Session](../E2E%20Playbooks/Multiplayer-Session.md) / [Multiplayer-E2E](../E2E%20Playbooks/Multiplayer-E2E.md)

Verification:
- author confirmations below
- optional two-client retest after mitigations (TOR-144)

Status: **resolved in code** (TOR-373 / TOR-374) — re-verify under TOR-144

---

## Resolution (same session)

| Issue | Linear | Change |
| --- | --- | --- |
| Hunger 5 pulse | **TOR-373** | Removed `core/hud_hunger_pulse.ttslua` and `overlay_hungerPulse_5_*` XML; static `overlay_hunger_5` only |
| Join timeout on seat | **TOR-374** | Defer `UI.setXml` ~4s in `refreshGlobalUiAfterSeatAssignment` |

### Author session fact (timeouts)

Timeout correlated with Host **manually seating Grey → Orange**. Client had already **heard music** and **seen the global blindfold** — partial join succeeded, then disconnect a few seconds after seat change. That matches synchronous connect-time `UI.setXml` during join sync (not P10 desync, not bootstrap-only).

---

## Context

After a complete multiplayer test with multiple connected clients, most flows went well except one player unable to connect. Two INBOX captures:

1. **Connection timeouts** (not “event desync”) while one of two clients tried to join.
2. **Erratic Hunger 5 overlay pulsing** on a client.

---

## Verdicts

| Issue | Verdict | Confidence |
| --- | --- | --- |
| **A — Join timeouts** | Seat-assign `UI.setXml` during join sync is the primary mod-side trigger after partial join. Large save/assets remain a secondary risk. Distinct from P10. | High |
| **B — Hunger 5 pulse** | Host-only per-frame `UI.setAttribute` alpha; no client animation. Removed (static overlay). | Very high |

---

## Issue A — Connection timeouts

### Symptom

Multiple **timeout** errors after Host seated the client **Grey → Orange**. Partial join already had music + global blindfold.

### Mechanism

`onPlayerChangeColor` → `refreshGlobalUiAfterSeatAssignment` ran **`UI.setXml(UI.getXml())`** synchronously (TOR-285 visibility). Full Global XmlUI rebuild during join sync can stall replication → TTS connection timeout.

**Mitigation (TOR-374):** defer that `UI.setXml` ~4s; post-refresh still waits for `UI.loading`. TOR-285 still runs eventually.

### Still useful ops

Friend joins after `Startup readiness gate complete`; simplified save; wired LAN; `npm run tts-save:list-loading-assets` if timeouts return.

---

## Issue B — Hunger 5 overlay pulse

### Resolution

Pulse layer removed (**TOR-373**). Hunger 5 uses static `overlay_hunger_5_<Color>` with TTS `FadeIn`/`FadeOut` only. Workshop asset `overlay_hunger_5_pulse` may remain in CustomUIAssets unused.

### Prior architecture (history)

Deleted `core/hud_hunger_pulse.ttslua` drove per-frame host `UI.setAttribute` via `U.Lerp`/`os.time()`. Smooth continuous pulse is not a good fit for TTS multiplayer XmlUI.

---

## References

- [Preparing For Multiplayer](./Preparing%20For%20Multiplayer.md)
- `docs/solutions/tts-xmlui-visibility-seat-assignment.md` (TOR-285 + TOR-374 deferral)
- `core/global_script.ttslua` — `refreshGlobalUiAfterSeatAssignment`
- `core/hud_overlays.ttslua` — static hunger tiers
