# Roll conditions policy layer — implementation checklist

Roll-policy **code** implements [Conditions System Guide §6](../PC%20Data%20&%20Tracking/Conditions%20System%20Guide.md#6-roll-policy-layer). Authors adding conditions should start with the **Agent quick guide** in that document, not this file.

## Phases

### A — Scaffolding

- [x] `lib/condition_roll_policies.ttslua` — merge helpers
- [x] `Conditions.resolveRollPolicy(playerID)` in `core/conditions.ttslua`
- [x] `core/roll_condition_handlers.ttslua` — empty `HANDLERS` + `run(hookName, ...)`
- [x] `RC.initiateRoll` — snapshot `active.rollPolicy`, call `RC.applyRollPolicyToActive`

### B — Tier 1 proof

- [x] `bloodSurgeDiceMultiplier` in `RC.activateBloodSurge`
- [x] `wpCanRerollHunger` → `ROLL_CAN_REROLL_HUNGER` in apply
- [x] Classification builder from policy (`countCriticalPairs`, `bestialNull`)

### C — Locked fields

- [x] `RC.setRollOptions` respects `rollPolicy.locked`

### D — Tier 3 stub

- [x] `wpRerollScope` branches in `applyWpRerollWaveStart`
- [x] `mandatoryFullWpReroll` handler skeleton

### E — Debug + doc pass B

- [x] `DEBUG.dumpRollPolicy(color)`
- [x] Agent rules + satellite docs point at Conditions System Guide
