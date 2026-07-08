# `.dev` Agent Docs Index

Use this file to decide what to read before touching a system. It is a routing index, not proof that the linked docs are current.

Always verify important claims against code before changing behavior.

## Start By Intent

| If the task is... | Read first | Then check |
|---|---|---|
| Starting the next scheduled task | [`RUNNING TASKLIST.md`](RUNNING%20TASKLIST.md), current workflow: [`../.cursor/skills/tr-start/SKILL.md`](../.cursor/skills/tr-start/SKILL.md) | Linear issue, relevant system docs below |
| Processing captured ideas/bugs | [`INBOX.md`](INBOX.md), current workflow: [`../.cursor/skills/tr-inbox/SKILL.md`](../.cursor/skills/tr-inbox/SKILL.md) | [`DEVELOPMENT_WORKFLOW.md`](DEVELOPMENT_WORKFLOW.md), Linear |
| Debugging a runtime issue | [`SOLVING ISSUES & DEBUGGING.md`](SOLVING%20ISSUES%20%26%20DEBUGGING.md), [`DEBUG_FILE_LOGGING.md`](DEBUG_FILE_LOGGING.md) | `core/debug.ttslua`, relevant system docs |
| Running or writing tests/playbooks | [`TESTING.md`](TESTING.md), [`E2E Playbooks/README.md`](E2E%20Playbooks/README.md), [`Step-By-Step Playbooks/README.md`](Step-By-Step%20Playbooks/README.md) | [`../.cursor/skills/step-by-step-guidance/SKILL.md`](../.cursor/skills/step-by-step-guidance/SKILL.md) |
| Bundling, Save & Play, or TTS extension issues | [`TTS_BUNDLING_SETUP.md`](TTS_BUNDLING_SETUP.md), [`TTS_MCP.md`](TTS_MCP.md) | `package.json`, `.tools/tts-save/`, `.tts/` |
| Reusing helpers or avoiding duplicate utilities | [`AVAILABLE_FUNCTIONS.md`](AVAILABLE_FUNCTIONS.md) | `lib/util.ttslua`, relevant modules |

## Core Architecture

| System | Read first | Source-of-truth code/data |
|---|---|---|
| Synchronization/reconcilers | [`Sychronizing Game Functionality/Reconciler Contract.md`](Sychronizing%20Game%20Functionality/Reconciler%20Contract.md), [`Sychronizing Game Functionality/Synchronization Architecture Proposal.md`](Sychronizing%20Game%20Functionality/Synchronization%20Architecture%20Proposal.md), [`../.cursor/rules/toronto-rising-synchronization.mdc`](../.cursor/rules/toronto-rising-synchronization.mdc) | `core/sync.ttslua`, `core/state.ttslua`, domain reconcilers |
| Multiplayer authority | [`Multiplayer Functionality/Preparing For Multiplayer.md`](Multiplayer%20Functionality/Preparing%20For%20Multiplayer.md), [`../.cursor/rules/toronto-rising-multiplayer-authority.mdc`](../.cursor/rules/toronto-rising-multiplayer-authority.mdc), [`Sychronizing Game Functionality/Bootstrap Authority.md`](Sychronizing%20Game%20Functionality/Bootstrap%20Authority.md), [`Sychronizing Game Functionality/Event Listener Policy.md`](Sychronizing%20Game%20Functionality/Event%20Listener%20Policy.md) | `core/global_script.ttslua`, event handlers, object scripts |
| Lua local function order | [`../docs/solutions/lua-local-function-order.md`](../docs/solutions/lua-local-function-order.md), [`../.cursor/rules/toronto-rising-lua-local-function-order.mdc`](../.cursor/rules/toronto-rising-lua-local-function-order.mdc) | Every touched `.ttslua` file |
| Object-script bundling | [`TTS_BUNDLING_SETUP.md`](TTS_BUNDLING_SETUP.md), [`../.cursor/rules/toronto-rising-object-script-bundling.mdc`](../.cursor/rules/toronto-rising-object-script-bundling.mdc) | `objects/`, `ui/ui_csheet*.ttslua`, `.tools/bundle-size-gate/` |

## Gameplay Systems

| System | Read first | Source-of-truth code/data |
|---|---|---|
| Dice and rolls | [`Dice System/Dice System Outline.md`](Dice%20System/Dice%20System%20Outline.md), [`Dice System/Custom Roll Mechanics.md`](Dice%20System/Custom%20Roll%20Mechanics.md), [`Dice System/Roll Broadcast Messages.md`](Dice%20System/Roll%20Broadcast%20Messages.md) | `core/dice.ttslua`, `core/roll_controller.ttslua`, `core/roll_ui.ttslua`, `lib/dice-roller.ttslua` |
| Conditions | [`PC Data & Tracking/Conditions System Guide.md`](PC%20Data%20%26%20Tracking/Conditions%20System%20Guide.md), [`../.cursor/skills/toronto-rising-conditions/SKILL.md`](../.cursor/skills/toronto-rising-conditions/SKILL.md) | `lib/condition_defs.ttslua`, `core/conditions.ttslua`, roll condition modules |
| PC data/state | [`PC Data & Tracking/PC Tracking & State Behavior.md`](PC%20Data%20%26%20Tracking/PC%20Tracking%20%26%20State%20Behavior.md), [`PC Data & Tracking/Character Sheet Modifications.md`](PC%20Data%20%26%20Tracking/Character%20Sheet%20Modifications.md) | `lib/json/PCS.json`, `lib/pcs_data.ttslua`, `core/state.ttslua`, csheet UI modules |
| Player HUD/overlays | [`HUDs & Overlays/Player HUD Overview.md`](HUDs%20%26%20Overlays/Player%20HUD%20Overview.md), [`HUD_FUNCTIONS.md`](HUD_FUNCTIONS.md) | `core/hud_player.ttslua`, `core/hud_overlays.ttslua`, `ui/player/`, `ui/storyteller/` |
| NPC spawning/spotlighting | [`NPC Object Spawning & Spotlighting/NPC Object Overview.md`](NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Object%20Overview.md), [`NPC Object Spawning & Spotlighting/NPC Reconciler Procedure.md`](NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Reconciler%20Procedure.md), [`NPC Object Spawning & Spotlighting/Storyteller Gameboard Control.md`](NPC%20Object%20Spawning%20%26%20Spotlighting/Storyteller%20Gameboard%20Control.md) | `core/npcs.ttslua`, `core/npc_gameboard.ttslua`, `lib/npcs_data.ttslua` |
| Lighting/table layout | [`Rotational Coordinate Generator.md`](Rotational%20Coordinate%20Generator.md), [`Table Seat Layout Audit.md`](Table%20Seat%20Layout%20Audit.md), [`NPC Object Spawning & Spotlighting/NPC Light Object Data.jsonc`](NPC%20Object%20Spawning%20%26%20Spotlighting/NPC%20Light%20Object%20Data.jsonc) | `core/lighting.ttslua`, `lib/rotational-seat-layout.ttslua`, `lib/constants.ttslua` |
| Soundscape/audio | [`Soundscape & Audio/SOUNDSCAPE_LUA_IMPLEMENTATION.md`](Soundscape%20%26%20Audio/SOUNDSCAPE_LUA_IMPLEMENTATION.md), [`Soundscape & Audio/SOUNDSCAPE_UNITY_SETUP.md`](Soundscape%20%26%20Audio/SOUNDSCAPE_UNITY_SETUP.md), [`Soundscape & Audio/UNITY_VS_TTS_AUDIO_LIFECYCLE.md`](Soundscape%20%26%20Audio/UNITY_VS_TTS_AUDIO_LIFECYCLE.md) | `core/soundscape.ttslua`, `lib/soundscape_catalog.ttslua`, `lib/guids.ttslua` |
| Scenes/scene constructor | [`Scene Constructor/Scene Constructor Overview.md`](Scene%20Constructor/Scene%20Constructor%20Overview.md), [`Scene Constructor/SchemaV2.jsonc`](Scene%20Constructor/SchemaV2.jsonc), [`Scene Constructor/import-template-full.jsonc`](Scene%20Constructor/import-template-full.jsonc) | `core/scenes.ttslua`, `core/scene_library.ttslua`, `core/storyteller_scenes_panel.ttslua` |
| Projects/coteries | [`Projects/Project System Overview.md`](Projects/Project%20System%20Overview.md) | `lib/json/Coterie.json`, `lib/coterie_data.ttslua`, `core/coterie.ttslua` |

## Tooling And Generated Outputs

| Area | Read first | Notes |
|---|---|---|
| Build/generator scripts | `package.json`, [`scripts/`](scripts/) | Path-sensitive; many package scripts call `.dev/scripts/*` |
| Custom UI assets | [`custom-ui-assets/README.md`](custom-ui-assets/README.md) | Workflow docs are versioned; generated manifests/reports are ignored |
| TTS save inventory | [`TTS_BUNDLING_SETUP.md`](TTS_BUNDLING_SETUP.md), [`custom-ui-assets/README.md`](custom-ui-assets/README.md) | `.dev/TS_Save_230.json` is a local ignored working snapshot used by save-analysis scripts |
| CSV to Markdown parser | [`CSV to Markdown Parser/README.md`](CSV%20to%20Markdown%20Parser/README.md) | Local app; package scripts use this path |
| Storyteller dashboard | [`storyteller-dashboard/README.md`](storyteller-dashboard/README.md) | Current dashboard app |
| Sheets Obsidian dashboard | [`sheets-obsidian-dashboard/README.md`](sheets-obsidian-dashboard/README.md) | Local app with ignored runtime outputs |

## Chronicle And Reference Data

| Area | Path | Notes |
|---|---|---|
| Chronicle/campaign material | [`Chronicle Data/`](Chronicle%20Data/) | Human review preferred; not engineering source of truth unless code explicitly consumes generated data |
| TTS API reference | [`tts-api/`](tts-api/) and [`TTS-Scripting-Guide.htm`](TTS-Scripting-Guide.htm) | Vendored/reference material |
| Positioning user guide | [`User Guides/TTS-3D-Positioning-Coordinate-Utilities.md`](User%20Guides/TTS-3D-Positioning-Coordinate-Utilities.md) | Useful for coordinate/math tasks |

## Path-Sensitive Notes

Moving these paths requires a dedicated reference update.

- `.dev/Sychronizing Game Functionality/` is misspelled but path-sensitive.
- `/tr-start` and `/tr-inbox` are current workflows to preserve during Phase 1, not permanent commitments.
