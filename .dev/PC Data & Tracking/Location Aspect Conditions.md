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
| resolveHalved | Halves Resolve before impairment penalties, rounded down, and subtracts the lost Resolve from Willpower capacity. Permanent ratings and damage are preserved. |
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

## NPC subjects

`core/npc_conditions.ttslua` resolves the same registry for NPC character keys. Black is only the
Storyteller roll surface; its character conditions and trackers never supply NPC effects. Present
NPC seats, stage placements, player-controlled NPCs and Scatter orbits receive the scene/location
union. Explicit absence wins over a retained placement. Roster and generic-bin membership alone
are not scene presence. Hosted effects are read from the current scene, so absence or a scene
change removes them without editing the saved stat block.

The dashboard mirrors only primitive rule ratings into each NPC's existing tracker identity.
Named and kept NPCs follow tonight's tracker records; unkept generics follow their scene record.
`seats.npcConditions` supplies the effective tracker capacities, Blood Potency, registry deltas,
active labels and manual checkbox list. Blood Potency changes affect Discipline, Surge, Mend and
Rouse reroll planning. Uniform impairment changes broad pools; named traits change matching
exceptional pools. Configure offers checkboxes for ambiguous skill bonuses and attribute-group
impairment on exceptional pools. Saved NPC stats remain unchanged.

For NPCs, **Resolve Halved reduces total Willpower capacity to half, rounded down**, without a
Resolve or Mental pool penalty. This is the provisional NPC interpretation stated in chat;
no optional Resolve/Survival stat fields are added. Existing damage is preserved when entering
or leaving the location. Ordinary impairment from filling the reduced track still applies.
Drowning asks the Storyteller to set a Resolve + Survival pool on the queued NPC check.

NPC Rouse checks retain separate power/check and Surge identities, including multiple checks of
one die kind. Oblivion can now add NPC Stains or present an individual Hunger-or-Stain choice;
Cemetery immunity and West Queen West retries use that same grouping. The Rouse and Willpower
automation settings apply to NPC costs too. Selective NPC rerolls enforce the shared policy;
Dupont and the Docks use the main Willpower action for their special behavior.

NPC Compulsions, corrupt Ambitions and replacement Desires are Storyteller decisions. Their
tracker popup shows pending choices and resolution buttons. UI-only conditions such as Frenzy
and Blindfold appear as NPC status labels; they do not put overlays on the Black player screen.

### NPC verification in TTS

1. Seat two vampire NPCs with Stats, put one on stage, and enter Casa Loma. Each present NPC's
   effective Blood Potency should rise by one, affecting its derived roll and Mend values.
   Make one absent and then change location: only the appropriate NPC's effects should leave.
2. At Redemption House, Willpower 8 should show capacity 4; Willpower 7 should show capacity 3.
   Mental and exceptional Resolve pools should stay unchanged by the halving rule. Leave the
   site and confirm capacity returns without changing existing damage.
3. In Configure, check impairment on a broad Physical pool and an exceptional Brawl pool. Use
   the exceptional-pool checkbox where needed. A named Dexterity pool must not be penalized twice.
4. Run Dupont, Docks, Little Italy, Rosedale, Cemetery and Weeping Cairn checks using the NPC's
   own roll. Confirm that the effects and costs reach that NPC, never the other NPC or Black.
5. Trigger a Compulsion, corrupt Ambition, replacement Desire and Drowning follow-up. Confirm
   the pending choices can be resolved and that the follow-up keeps the correct NPC identity.
6. Repeat with an unkept generic, then keep it. Its condition state should follow its tracker
   record. Change scenes and confirm that scene counters and unkept generic state start fresh.
