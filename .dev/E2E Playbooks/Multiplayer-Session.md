# Multiclient Session Script (TOR-249 / TOR-144)

**Goal:** ~25–35 minutes. One linear script. **Pass** = no duplicate world effects, correct auto-seat, phase connect blindfold matches policy, join client stays connected.

**Roles**

| Who | Seat | Drives |
| --- | --- | --- |
| You (Host) | **Black** / Storyteller (Steam auto-assign) | All ST steps |
| Friend | Chronicle PC color from `C.PlayerData` (auto-assign) | Watch, report, one Roll, optional console line |

Friend does **not** need the ST panel and should **not** manually pick a seat unless auto-assign fails.

**Chronicle seat map:** Thaumaterge→Brown, Hastur→Orange, PixelPuzzler→Red, JRook→Pink, Roarshack→Purple (`lib/constants.ttslua`).

---

## Before the call

| # | Who | Action |
| --- | --- | --- |
| 1 | Host | `npm run build` if UI changed; **Save & Play** on the Storyteller machine. Confirm you land on **Black**. |
| 2 | Host | Friend’s Steam ID is in `C.PlayerData` with the intended PC color. Unregistered → **White**. Tell friend the expected color. |
| 3 | Host | Prefer **`currentPhase = Play`**. If the save is in **Intermission**, either Advance → Play before inviting, or plan A4 then B0 so the friend is not stuck under the connect blindfold. |
| 4 | Host | Known scene (or no-scene default), simple/empty gameboard. **Do not** sit in the friend’s chronicle color — leave it free for auto-assign. |
| 5 | Friend | TTS + Steam; accept your invite (needs a TTS license). |
| 6 | Friend | Join **after** Host is already in-game. |
| 7 | Both | Friend reports visual/audio glitches, wrong seat, chat/console errors; you drive ST steps. |

### P10 (known — do not fail the pass for this alone)

Join-client console `S.getStateVal` / some HUD text may **lag** Host while the **table still looks correct**. That is expected until a live state sync bridge exists.

| Observation | Score |
| --- | --- |
| Table matches Host; friend’s Lua/HUD numbers differ | **Document P10** — keep going |
| Table disagrees (double motion, missing props) | **Fail** |
| Friend click does nothing | **Fail** (not P10) |

Log line: `P10 D2: Host placements=N, Friend placements=M; world matched.`

Full policy write-up: [Preparing §1.1a](../Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md#11a-p10--live-gamestate-broadcast-gap-known).

### Friend briefing (copy-paste)

> You'll join my TTS game for ~25–30 minutes. Your seat color should assign automatically from your Steam account — tell me which color you land on (expect **\<COLOR\>**). Watch for things moving twice, weird double sound fades, a stuck blindfold, or errors in chat. If I ask you to run a short console line and the **number** differs from mine but the **table looks the same**, that's a known quirk — just tell me both numbers. I'll ask you to click Roll once on your seat. You don't need to learn the mod — just tell me if something looks wrong compared to my screen.

---

## Phase A — Connect, auto-seat & authority (~5 min)

| # | Host | Friend | Pass if |
| --- | --- | --- | --- |
| A1 | Stay Black; wait for connect | Accept invite; **do not** pick a color unless stuck | Friend lands on **chronicle color** (or White if unregistered); same table; no kick |
| A2 | Confirm still Black | — | ST seat unchanged; no fight for a PC color |
| A3 | — | Watch table ~10s | **No** figurines sliding, lights sweeping, or audio fade on join |
| A4 | `print(S.getStateVal("currentPhase"))` | Report blindfold up or down | **Intermission:** blindfold stays up. **Any other phase:** blindfold lowers |
| A5 | Check Host console | — | Bootstrap clean; seats look right |

**If A1 → White unexpectedly:** Steam ID missing from `C.PlayerData` — fix, Save & Play, rejoin. Not a replication bug.

---

## Phase B — ST world actions (~8 min)

Friend watches for **double** motion, stacked audio, or jitter. Friend should be past the connect blindfold (Play, or after B0).

| # | Host | Friend | Pass if |
| --- | --- | --- | --- |
| B0 | If still Intermission: Phases **Advance →** into **Play** | Watch lights/theme/blindfold | Single transition; one theme/audio change |
| B1 | One NPC control token on gameboard; **Apply** | Watch stage | **Single** move; no fight/jitter |
| B2 | **Clear** gameboard | Watch | Clear once; palette/board match Host |
| B3 | Drop one control token on palette snap | Watch | Snaps once; no lag spike |
| B4 | Scenes: **Apply** a different library scene (or location/mood) | Watch lights/audio/HUD | Scene matches Host; **one** audio fade |
| B5 | Toggle **signal candle** (if present) | Watch fire | **One** light transition |
| B6 | Change soundscape mood once | Listen | **One** fade; no doubling |

---

## Phase C — PC roll from join client (~5 min)

| # | Host | Friend | Pass if |
| --- | --- | --- | --- |
| C1 | Friend’s seat bags ready; open/select roll for their color if needed | — | Roll UI visible for friend |
| C2 | — | Click **Roll** (or bag → roll) | **One** die set; drawer once; no duplicate spawns |
| C3 | — | **Confirm** or cancel | UI sane; Host table matches |
| C4 | Host console | — | No duplicate spawn errors |

**If C2 double dice:** file bug against roll / dice_bag routing.

---

## Phase D — Join HUD, phases & P10 (~4 min)

Read the [P10](#p10-known--do-not-fail-the-pass-for-this-alone) reminder before D1/D2.

| # | Host | Friend | Pass if |
| --- | --- | --- | --- |
| D1 | Note phase; optional Play subphase switch or safe Advance | Compare **table** (lights/blindfold/theme) and phase label | Table matches once. Label lag + matching world → **document P10**, still Pass |
| D2 | After B1, both run the probe below | Same | Counts **may differ** (P10). Pass if both see the **same figurines** |
| D3 | — | Open a **PC-only** panel (e.g. roll control) | Opens; **no** ST-only controls (Advance, gameboard Apply, …) |

**D2 probe** (both machines, `~` Global):

```lua
print("placements=" .. tostring(#(U.getKeys(S.getStateVal("sessionScene","npcWorld","placements") or {}))))
```

---

## Phase E — Disconnect / rejoin (~2 min)

| # | Host | Friend | Pass if |
| --- | --- | --- | --- |
| E1 | — | Disconnect cleanly | Host stable; no console spam |
| E2 | Optional | Rejoin; **do not** pick color | Same chronicle color; stable join; no bootstrap thrash; blindfold matches A4 for current phase |

---

## Outcomes

| Result | Next step |
| --- | --- |
| All Pass rows green (P10 notes OK) | Comment **TOR-144**; mark **TOR-249** Done; deeper matrix later if needed |
| Wrong seat / White | Fix `C.PlayerData`; don’t hotseat their color; rejoin |
| Blindfold stuck in Play | Bug — note phase at join |
| Duplicate world (B0–B6, C2) | Note scenario id; dual-apply / routing |
| Nothing on friend click | `Global.call` / steam gate |
| Lua/HUD stale, world OK | **P10** — document; do not fail |
| Capture | Scenario id, Host vs friend, screenshot or console, save name |

---

## Coverage (what this script exercises)

Each row is covered by a Phase step above. Use this as a sign-off checklist; do **not** run it as a second script.

| Scenario | Step |
| --- | --- |
| Join mid-session / no bootstrap thrash | A1–A3, A5 |
| Steam auto-seat | A1–A2, E2 |
| Connect blindfold (Intermission vs other) | A4 |
| ST Advance → Play | B0 |
| ST Apply / Clear gameboard | B1–B2 |
| ST token drop | B3 |
| ST scene change | B4 |
| Signal candle | B5 |
| ST soundscape mood | B6 |
| PC roll from join client | C1–C4 |
| Phase HUD | D1 |
| Placements probe / P10 | D2 |
| PC-only UI (no ST leak) | D3 |
| Rejoin auto-seat | E2 |

Agent-oriented matrix + hotseat console probes: [Multiplayer-E2E.md](Multiplayer-E2E.md).

---

## After the session

1. Linear comment on **TOR-144** with pass/fail per phase + any `P10 …` log lines.
2. File bugs with scenario ids (A1, B1, C2, …).
3. If all green → mark **TOR-249** Done.
4. Optional later: full Advance loop, Memoriam LUT (**TOR-101**), absent-player presence (**TOR-293**), P10 sync bridge.
