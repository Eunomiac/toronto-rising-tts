# NPC Stats

Please refer to the image mockup at `.dev\Storyteller Dashboard Docs\NPC Stats Mockup.png` for a visual design reference.

A new button should be added to the right-click configuration menu of NPC tokens, which opens up a panel for setting various stats on an NPC.  These stats can then be referenced in various ways, most notably by the Storyteller dice roller system, offering another way to form NPC dice pools in addition to the existing manual addition of dice.  All stat data should be stored by the Storyteller Dashboard in JSON file(s).

## Named vs. Generic NPCs

Named NPCs (both primary and Memoriam) shall have a single set of stats, which will always be linked to that character and will persist through any scenes where that character is present.

Generic NPCs (again, both primary and Memoriam) can have five different stat blocks, each stored under a tab within the stat modal: "Weak", "Average", "Gifted", "Deadly", and "Superhuman". The Sheet decides which tier blocks are actually configured for a generic type.

When a generic NPC is clicked in the roster and would be added to the "In this scene" bin, if more than one tab has been configured with stats, the Storyteller is presented with a quick tier picker. Once a tier is assigned, its badge appears at the token's top right. Memoriam tokens also show their year badge; additional badges extend left. The FULL build bakes year badges and every configured generic-tier variant into the TTS spotlight-token images, and TTS swaps the image when the selected tier changes.

If an NPC has no stat blocks configured, they should be added to the stage normally (i.e. as they are now).

## Stat Block Components

### Kind

A row of buttons along the top to define the type of the NPC: "Mortal", "Animal", "Ghoul", "Vampire", "Werewolf", "Spirit", "Other". Use colors and a narrow font (Bebas Neue) to ensure these can be displayed cleanly in a single row without wrapping. Upon selecting the kind of NPC, that button should be highlighted, and the rest of the panel should be updated with any fields that are conditional on the kind of NPC being configured (e.g. "Blood Potency" should only show up for Vampires).

### Top Row

Immediately beneath the "Kind" buttons should be a space for several conditional fields that depend on Kind. For now, this row should only be displayed if the Kind is "Vampire", and it should contain the following labels and fields in a horizontal row:

* **Generation Input**: Number from 1 - 17
* **Label**: `"th Gen."` in small caps
* **Clan Dropdown**: A dropdown containing all clans listed in `constants.ttslua`
* **Rank Dropdown**: A dropdown containing rank options: "Fledgling", "Neonate", "Ancilla", "Elder", "Methuselah", "Blood God"
* **Label**: `"Blood Potency"` in small caps
* **Blood Potency Input**: Number from 1 - 10
* **Label**: `"Humanity"` in small caps
* **Humanity Input**: Number from 1 - 10

### General Difficulty

"Difficulty" should present two input fields separated by a forward slash. The first number is the difficulty for actions against this NPC in areas where the NPC is well-suited, and the second number if the difficulty for all other actions against this NPC.

This provides another method of setting the difficulty on a PC's roll, in addition to the difficulty strip. Instead of clicking a number on the difficulty strip, the Storyteller can drag a token from the stage, seat, or roster onto the roll in the Dashboard roll panel. Upon doing so, any of the two difficulty values that have been set should be highlighted in the strip. No other action need be taken; this is just a visual indicator the ST can use to select the proper difficulty.

### Trackers

On the same row as Difficulty, to the right, labeled inputs for the Health and Willpower trackers should be displayed for all NPC kinds.

### Dice Pools

NPCs have three categories of dice pools: "Standard" dice pools describe broad categories, while a more customizable list of "Exceptional" dice pools allow for increased dice pools for specific areas of the NPC's expertise, training, or abilities. Finally, a set of "Attack" dice pools to incorporate a damage bonus (see below). When an NPC roll is initiated and the ST clicks the button to configure the roll, in addition to the dice buttons to build the pool manually, all configured dice pools should be displayed as a grid beneath for easy selection.

When a pool is selected, the roll should auto-populate with a dice pool of the appropriate size, applying the Vampire's Hunger level and/or Werewolf's Rage level (see below).

When such a roll is resolved and broadcast, the name of the dice pool used should be displayed in the roll message, as should the name of the attack used, and its weapon bonus, all in one concise line (e.g. "Mylene 'the Puck' Hamelin attacks with Brawl (Feral Claws) — Feral Claws +2"), and the weapon bonus should be applied to the margin if the roll was a success.

#### Standard Dice Pools

Every NPC displays "Physical", "Social", and "Mental". A populated fourth pool is shown as "Powers" for otherwise ordinary Kinds, or with the supernatural Kind's specific name:
* Vampires & Ghouls - "Disciplines"
* Werewolves - "Gifts"
* Spirits - "Manifestations"

#### Exceptional Dice Pools

Beneath the Standard pools, Exceptional pools can be defined, added, edited, and removed. Their dice value is derived rather than stored: twice the NPC's exceptional Difficulty (the first Difficulty number). A Deadly NPC with Difficulty `5/3` therefore rolls 10 dice for every Exceptional pool. The editor still stores this derived value so the roller can use it directly.

#### Attack Dice Pools

After Exceptional dice pools, another "+"-controlled block for adding attacks should be displayed. Once added, an attack dice pool should appear in rows with three components:
* **Name** -- the name of the attack, for display purposes
* **Pool** -- a dropdown list populated with all currently configured Standard and Exceptional dice pools; choosing one makes that the dice pool for this attack
* **Bonus** -- a number field containing an integer that is added to the margin of the attack roll as successes IF the roll is successful

### Powers

Powers are configured by the broader category (e.g. the Discipline name), which itself has multiple entries within it (e.g. the individual discipline powers). The "+" button is used to add a new power set, and a power set is cleared if both the name and the number on the category are empty when the panel is closed.

The entries within each should contain:

* **Level** -- A very small superscript number representing the level of the power. It can run from 1 to 5, and it should be very unobtrusive (as it will rarely need to be changed). Clicking it should reveal a simple dropdown where a different value from 1-5 can be selected.
* **Name** -- The name of the power
* **Rouse Checks Input** -- _Only for "Vampire" and "Ghoul" Kinds_ The number of rouse checks needed to activate the power; a number from 0 to 5
* **Dice Pool** -- A dropdown containing all standard, exceptional, AND attack rolls thus far defined (similar to how attack rolls are constructed), as well as an em-dash option for passive powers (or powers that do not require a roll).

One blank space to add a new entry should always exist beneath each category -- when one is filled in, a new blank entry should appear. The **Level** value of this blank entry should always default to one more than the previous entry, to a maximum of 5.

When constructing the pool selection popup for configuring storyteller rolls as described above, the individual entries under each power should be listed (i.e. not the category names themselves).

### Advantages

Named NPCs can have Advantages, one editable entry per line. Advantages have no roll-trait or Difficulty controls and are never roll buttons. Generic NPCs do not receive Advantages.

### Notes

Notes use a toolbar-free rich-text field. Standard Ctrl/Cmd+B and Ctrl/Cmd+I shortcuts provide inline bold and italic; other formatting is removed when saved. Imported Ancilla, Elder and Methuselah powers and Special Abilities each appear on their own line with the power or ability name in bold. Discipline Expression is not imported.

### Hunger

Hunger does not need to appear on the configuration screen at all (there is nothing to configure; it is always 5), but it is a value that needs to be tracked for Vampires.

When a Storyteller roll is initiated via this drag-and-drop/selected pool method, convert a number of dice in the pool to Hunger dice equal to the NPC's current Hunger value -- unless rolls of that type do not use Hunger (e.g. Willpower rolls -- same rules as for PCs apply).

## Storyteller Roll Adjustments

### Passive "Rolls"

If a power is selected, but it has no associated dice pool and it has 0 rouse checks, simply broadcast a "[X] activates [name of specific power] ([name of category]) -- e.g. "Mylene 'the Puck' Hamelin activates Feral Claws (Protean)".

### Rouse Checks

If the selected power has a rouse check but does not have a roll, simply make the rouse check and broadcast it along with the activation message.

If the selected power requires a rouse check _and_ a roll, the rouse check should be included in the standard roll as with PC combined rouse + standard rolls.

If the selected power requires _multiple_ rouse checks, they should all be made in a single combined roll. This exceeds what PCs are capable of (i.e. they can only combine a single rouse check into a standard roll), so some extra Lua support will be needed to tag the dice so each rouse check can be properly separated from each other.

If the selected power is under the "Oblivion" or "Ceremonies" categories, any rouse checks given by the discipline name should be oblivion rouse checks.

Finally, when making rouse checks for vampire Discipline powers, consult the Blood Potency data to get the character's "discipline reroll value". If the **Level** of the power is equal to or lower than this value, all rouse checks made to activate the power gain an extra die.

### Discipline Rolls

If an NPC's kind is vampire and a Power is selected as the dice pool, the NPC's discipline bonus (from their blood potency data) should be automatically added as bonus dice in addition to the associated dice pool.

### Blood Surge

For rolls in which blood surge is available (same rules as PCs apply),  a blood surge toggle-button should appear on the dice pool selection popup. If blood surge is activated, the NPC's blood surge bonus (from their blood potency) should be added as bonus dice to the roll, and a blood surge rouse die should be added to the roll as well.

## More on Trackers

### Updating Trackers

Double-clicking on a stage token (or single-clicking on a seated NPC, to match seated PC behavior) should bring up a panel similar to the PC trackers panel when clicking on them in the seat strip. It should show their four trackers, with ring menus to make adjustments to each one.

For vampires, however, there is an additional option that should be added to the Health tracker's ring menu: "Mend". When this button is clicked, a Storyteller roll for that vampire should immediately be opened, rolled, concluded, and broadcast using the standard 'quick rouse check' timing we use for PCs. Regardless of whether the rouse check succeeds or fails, a number of superficial health damage equal to the vampire's mending value (derived from their Blood Potency; see the tables in `constants.ttslua`) should be healed.

When a Storyteller roll rerolls dice for spending willpower, a point of superficial Willpower damage should be dealt to the NPC's tracker.

When a vampire fails a rouse check, their Hunger should be increased. When a vampire's Hunger reaches 3 or more, a blood droplet badge should appear on their token (or their seat position) with a number displaying their current hunger value.

#### Initial Tracker Values

Whenever an NPC is added to the stage or a seated position (either by transitioning to a phase/scene or directly from the npc roster), if this is their first appearance of the night, their Health and Willpower trackers should be reset to full and their Hunger value should be set to 1 or 2 (randomly determined). These values should persist throughout the night, regardless of the scene in which the NPC appears.

## Live conditions

Current implementation: `core/npc_conditions.ttslua` owns the NPC interpretation of the shared
condition registry; `src/shared/npcConditions.ts` applies its resolved deltas to a read-only view
of the dashboard stat block. `useNpcLive` sends changed primitive rule ratings to TTS through
`npcConditionStats`, with a comparison guard to avoid refresh loops. No biography or power text
is mirrored. The source JSON and sheet data remain unchanged by scene conditions.

The tracker popup lists active effects and manual condition checkboxes, Stains, and pending
Compulsion/Ambition/Desire decisions. Configure offers trait and exceptional-pool impairment
checkboxes when aggregate NPC pools need the Storyteller's judgement. Roll Options is available
for NPC rolls and uses the same registry overlay as PC rolls.

See [Location Aspect Conditions](../PC%20Data%20%26%20Tracking/Location%20Aspect%20Conditions.md#npc-subjects)
for Resolve-pool halving and the quarter-Willpower approximation, Drowning pool decisions, identity/lifetime rules and the
live-game verification checklist.

## Custom roll trait associations and difficulties

Exceptional rolls, Attacks and individual Powers accept optional `traits: [first, second]` and
`difficulty` text. Focus the row's name to unfold the Pools bar above it and Difficulties bar
below it. The bars stay open while editing their controls and close when focus leaves the row.
The two trait fields accept free text: Attributes, Skills, Trackers, Powers, Advantages or Flaws.
Names are matched without case, spaces or punctuation; explicit associations take precedence
over a roll's display name. Empty metadata keeps existing stat blocks compatible.

Conditions add matching trait modifiers to the pool. A multiplier on one associated trait is
weighted by its share: 1 with one defined trait, 0.5 with two. For Resolve Halved, an 8-die pool
associated only with Resolve becomes 4; Resolve + Composure becomes 6 (`8 * (1 - .5 * .5)`).
The weighted result is rounded down before additive modifiers. Derived NPC Willpower retains
its separate quarter-capacity approximation. Unassociated rolls retain the existing named-pool
and Storyteller-choice behavior.

An Attack or Power inherits its referenced pool's associations and difficulty unless it defines
its own. Each field inherits separately. Its conditions are calculated from the original pool
once; linked entries do not accumulate penalties. Attack damage and Discipline Bonus remain
separate from the trait adjustment. Passive announcements and Rouse-only activation checks
continue to use their existing rules.

Difficulty syntax (0–15, matching the NPC difficulty input range):

- `3`: start at difficulty 3; the Storyteller may revise it.
- `2-5`: show only 2, 3, 4 and 5 on the live difficulty strip.
- `4+`: show 4 through 15 and keep **–**, the no-difficulty choice (0).
- Blank: inherit from the linked pool, or leave the difficulty unconfigured.

A range/minimum preserves a previously chosen difficulty only if valid; otherwise the roll
waits for a valid choice. Selecting an unconfigured custom roll clears the prior filter.
TTS enforces the filter as well as the dashboard. Invalid text stays editable and prevents
closing/saving until corrected.

The Sheet notation stores trait associations on Exceptional pools, Attacks and Powers, and stores
Power Difficulty rules after an underscore. Import uses the Sheet value when present and preserves
matching local metadata only when that particular Sheet field is blank. Sheet write-back exports
the same notation for named present-day NPCs.

## Sheet import

`npm run npc-stats:import` reads all four stat sources in **Toronto Rising**: `CHARACTERS`,
`GENERICS STATS`, `MEM NAMED STATS`, and `MEM GENERIC STATS`. Player characters are excluded by
`IS PC?`. Present-day generics map by Label; named Memoriam rows map by Memoriam Key; Memoriam
generic rows map to their catalog stems using Label, Location, Year and Tags. Any invalid or
unmatched row stops the import before the stats file is replaced.

Code: `src/shared/npcCustomRolls.ts`, `npcStats.ts`, `npcConditions.ts`, `npcRollPlan.ts`;
editor: `src/client/scenesPanel/npcCustomRollFields.tsx`; TTS rules: `lib/npc_roll_difficulty.ttslua`.
