# Location Aspect conditions

## Agent routing

Read when changing location conditions, their roll hooks, scene counters, or conditional roll options.
Source of truth: the DISTRICTS and SITES tabs of **Districts & Sites of Toronto Rising**,
`lib/condition_defs.ttslua`, `core/location_conditions.ttslua`, and `core/conditions.ttslua`.
The author supplied an XLSX export on 2026-10-19; it was read locally and is not committed.

Verification: `npm run locations:conditions:test`, `npm run locations:import:test`,
`npm run build:gates`, followed by the in-game checks below. The Lua tests require Lua 5.2+
or `texlua`; set `LUA` to choose an executable.

## Implemented mechanics

| Condition | Behavior |
| --- | --- |
| launchBonus2 | Two extra dice on Launch rolls. |
| memoriamBonus2 | Two extra dice during Memoriam. Outside Memoriam, the Storyteller can enable **Launch increases a criminal Background (+2)** in Roll Options for a Launch in this district. These bonuses do not stack with one another. |
| messyRouseTallyBonus | One extra die per prior confirmed Messy Critical or completed Rouse check in the scene. Multiple dice resolving one check count once. |
| messyCompulsion | A confirmed Messy Critical draws a Compulsion using the existing seat-deck workflow. |
| fullWPReroll | Spending Willpower unlocks every standard and Hunger die, including criticals. Every eligible die must be rerolled before leaving the wave. |
| surviveFailure | The first ordinary Failure queues a Resolve + Survival check at difficulty 4. A failed follow-up reports the original roll as a Total Failure. Bestial and Total Failures are distinct classes. |
| doubleBloodSurge | Doubles Blood Surge bonus dice. |
| noFrenzy | A failed frenzy check requests a corrupt Ambition instead of activating frenzy. The Storyteller chooses it and tracks its resolution. |
| noBloodSurge | Prevents Blood Surge activation. |
| upgradeStandardSuccess | Automatically changes the first successful standard die showing 6–9 to 10, once per roll. Hunger dice and existing 10s are left alone. |
| rerollSuccessfulRouse | Physically rerolls the dice of a successful Rouse check once and uses the new outcome. Separate Blood Surge and Oblivion checks are handled separately. |
| setHungerWPReroll | Spending Willpower sets one Hunger die to 10 instead of opening a reroll wave. Without an eligible Hunger die, spending is refused before charging Willpower. |
| scaryWPReroll | Spending Willpower on a Messy Critical, Bestial Failure, or Total Failure queues a difficulty-3 fear frenzy check after the current roll. |
| resolveHalved | Halves effective Resolve, rounded down, and subtracts the lost Resolve from Willpower capacity. Permanent ratings and damage are preserved. |
| remorseBonus2 | Two extra standard dice on Remorse rolls. |
| toxicRouse | A failed Rouse check adds one aggravated Health damage through the usual tracker pipeline. Respects the Rouse automation setting. |
| scaryStain | Gaining Stains queues a difficulty-4 fury frenzy check; clearing Stains does not. |
| noObvRouseDice | Oblivion checks still resolve Hunger, but confer no Stains and never present the Hunger-or-Stain choice. |
| bestialReset | Bestial Failure heals all Superficial Willpower damage, preserving aggravated damage, and asks the Storyteller for a replacement Desire. |
| woundToCompulsion | On site entry, more than half the Willpower track filled with damage draws a Compulsion. Ordinary refreshes and later damage do not retrigger entry. |

All these conditions use the existing hosted-condition reconciliation for present PCs.
Leaving the scene or becoming absent removes their ongoing effects. Scene application resets the
scene counters even when the new scene uses the same location. Already triggered consequences
such as a Compulsion or an unresolved corrupt Ambition are not silently removed.

The normal build import now retains every requested key. Existing accent and soundscape-alias
warnings are separate sheet-cleanup items.

## In-game verification

After pulling the change, build the usual Lua/XML outputs and Save & Play.

1. Seat two PCs, make one absent, and apply a location with a condition. Only the present PC
   should receive it. Bring the absent PC into the scene, then leave the location: the effects
   should appear and disappear accordingly.
2. At Redemption House, check an odd Resolve rating and its Willpower capacity. Leave the site
   and confirm both return to their original values without healing or deleting damage.
3. Compare Launch, Remorse, and Memoriam pools at the relevant locations. At the Distillery,
   enable the criminal-Background checkbox only for a qualifying Launch. Refreshing options
   must not keep adding bonus dice.
4. At Dupont, spend Willpower and reroll every standard and Hunger die, including 10s. Confirm
   must not end a partial wave. At the Docks, spending should instead set just one Hunger die
   to 10 and keep every other die locked.
5. At West Queen West, succeed at a Rouse check and verify it is rerolled once. At the Cemetery,
   check Oblivion faces 1, 10, and a mixed result: Hunger may increase, but Stains never do.
   At Weeping Cairn, fail a Rouse check and verify one aggravated Health damage is added.
6. At the Don Ravine, complete a Rouse check and a Messy Critical, then check the next pool's
   bonus. Recalculate repeatedly and verify the tally is unchanged. Apply another scene and
   verify the tally resets.
7. Trigger the Compulsion, frenzy-check, and Bestial Reset rules at their respective sites.
   Verify that Willpower healing preserves aggravated damage and that the Storyteller receives
   the required Desire or Ambition choice. Changing damage after entering Street Corner must
   not trigger a second entry effect.
8. At Lake Ontario, confirm an ordinary Failure. Resolve the queued Drowning check; a failure
   must report the original roll as a Total Failure. Further Failures in that scene must not
   queue another check.
