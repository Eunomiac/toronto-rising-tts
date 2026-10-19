# NPC Stats

Please refer to the image mockup at `.dev\Storyteller Dashboard Docs\NPC Stats Mockup.png` for a visual design reference.

A new button should be added to the right-click configuration menu of NPC tokens, which opens up a panel for setting various stats on an NPC.  These stats can then be referenced in various ways, most notably by the Storyteller dice roller system, offering another way to form NPC dice pools in addition to the existing manual addition of dice.  All stat data should be stored by the Storyteller Dashboard in JSON file(s).

## Named vs. Generic NPCs

Named NPCs (both primary and Memoriam) shall have a single set of stats, which will always be linked to that character and will persist through any scenes where that character is present.

Generic NPCs (again, both primary and Memoriam) require a bit more work, as they are meant to be able to represent characters of different skill levels. As such, generic NPCs will have four different stat blocks, each stored under a tab within the stat modal: "Weak", "Average", "Gifted", and "Deadly".

When a generic NPC is clicked in the roster and would be added to the "In this scene" bin, if more than one of the four tabs have been configured with stats, the Storyteller should be presented with a quick popup selection  modal allowing the Storyteller to select which stat block to apply to this generic NPC in this scene. Once a stat block has been assigned to a generic NPC, a badge should be added to the top left of their Dashboard token display representing the chosen level. These badges can be found in `/assets/badges`: `tier_deadly.svg`, `tier_gifted.svg`, `tier_average.svg`, `tier_weak.svg`.

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

Mortals and Animals should display only three Standard dice pools: "Physical", "Social", and "Mental". Supernatural creatures gain a fourth Standard dice pool, whose name differs depending on the kind of creature:
* Vampires & Ghouls - "Disciplines"
* Werewolves - "Gifts"
* Spirits - "Manifestations"

#### Exceptional Dice Pools

Beneath the row of three or four Standard dice pools should be a place where Exceptional dice pools can be defined, added, edited, and removed. A "+" icon should add a dice pool, which consists of a name (e.g. "Leadership", "Academics (Sociology)", etc.) and the size of the pool. Any incomplete pools (e.g. missing a name and/or a number) should be deleted when the panel is closed and saved.

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

### Notes

Finally, a simple, scrollable text field (no need for rich text) should be added to the bottom of the popup panel. The contents of this panel should be displayed within the popup modal for roll configuration.

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
for Willpower-only Resolve-halving, Drowning pool decisions, identity/lifetime rules and the
live-game verification checklist.
