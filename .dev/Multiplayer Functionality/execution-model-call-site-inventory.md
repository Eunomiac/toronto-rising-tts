# Execution model — call-site inventory (TOR-284)

Generated 2026-07-04 during remediation. **All rows actioned** in Steps 3.1–3.6.

| File | Symbol | Category | Action | Stage |
| --- | --- | --- | --- | --- |
| `core/sync.ttslua` | `isHostClient` (7×) | A | Remove short-circuits; always reconcile | 3.1 |
| `core/main.ttslua` | `onLoadJoinClient` | A | Delete function | 3.2 |
| `core/global_script.ttslua` | join `onLoad` branch | A | Remove early return | 3.2 |
| `core/global_script.ttslua` | `trEarlySilence*` `isHostClient` | A | Remove guards | 3.3 |
| `core/global_script.ttslua` | chunk `bootstrapSilenceStrayEmitterLoops` | A | Unconditional when SS present | 3.3 |
| `core/global_script.ttslua` | `requireHostForWorldMutation` (~44×) | A | Strip guards | 3.3 |
| `core/global_script.ttslua` | `requireStorytellerHostForMutation` (32×) | C | Rename → `requireStorytellerForMutation`; steam only | 3.3 |
| `core/global_script.ttslua` | `GlobalRequireHostForWorldMutation` | A | Delete export | 3.3 |
| `core/global_script.ttslua` | `onSave` / `GlobalGameboardInstallPaletteSnaps` `isHostClient` | A | Strip guards | 3.3 |
| `core/global_script.ttslua` | `onPlayerChangeColor` positive host guard | A | Always call `M.onPlayerChangeColor` | 3.3 |
| `core/scenes.ttslua` | `isHostClient` (2×) | A | Remove | 3.4 |
| `core/npc_gameboard.ttslua` | `requireHostForWorldMutation` (2×) | A | Remove | 3.4 |
| `core/roll_controller.ttslua` | `requireHostForWorldMutation` | A | Remove | 3.4 |
| `lib/pc_roll_tray_lower.ttslua` | `requireHostForWorldMutation` | A | Remove | 3.4 |
| `objects/dice_bag.ttslua` | `GlobalRequireHostForWorldMutation` (3×) | A | Remove | 3.5 |
| `ui/ui_csheet_core.ttslua` | `GlobalRequireHostForWorldMutation` | A | Remove | 3.5 |
| `lib/util.ttslua` | `isHostClient`, `requireHostForWorldMutation` | A | Delete; remove orphan `solePlayerRefOrNil` | 3.6 |

**Kept (category B):** `GlobalIsStorytellerSteamPlayer`, `U.isStorytellerSteamPlayer`, `isStorytellerSteamPlayer` local in global_script, `C.StorytellerID` data-keying (~40 hits), npc_control_board steam gates.

**Out of scope:** `.dev/testbed/TEST BED.ttslua` host probe (updated separately).
