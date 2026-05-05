# Overview of NPC Spawning & Object Modifications

## Quick Fixes

1. Enable the tooltips for NPC cutouts once spawned.
2. Set the tooltips of spawned NPC cutouts to their full names (if tooltips are currently being used for functionality, use something else for the functionality).
3. Change how lights are handled -- currently, they are automatically toggled on whenever an NPC is spawned in. Instead, lights that are disabled (as they are when NPCs are spawned in) should only be enabled automatically IF the NPC is spawned OR moved into an area whose `autoLight` field (in `D.areas`) is `true`. Otherwise, their light state should remain unchanged (meaning it may be enabled if the light was activated while they were in a previous position, before being moved into the new area).

## NPC Panel Overhaul

I think I've come up with a new style for this panel.  Instead of having "Individuals" and "Groups" as separate sections, I'd like to group all of the individuals _under_ their assigned group.

When the NPC panel opens, it should display any active Areas rows, and then it should immediately show the "Groups" rows, with the following changes:

1. The background color of each group row should be set to the `labelColor` assigned to the NPC whose `groups[groupKey]` value is `1`. The foreground color should be bold and black.
2. To the left of the label name for that group, a square button should allow twirling the group down to reveal a row for each of the members of that group, sorted by their `groups[groupKey]` integer in `D.characters` (which will put the boss/leader at the top, since they are always `1`). (Note: Some npcs are members of multiple groups, and will need to have rows generated in all groups they are members in.)
3. The twirled-down rows for individuals should be indented slightly from the left.
4. If an individual in the twirled-down submenu is spawned into a location with their own controls, they should not be removed from that group's list of entries.  Instead, the button corresponding to the position they've been moved to should be colored a bright green to indicate their location (they should still appear in the Areas section, which is the primary place I'll want to be able to control spawned NPCs)
5. If the master group control buttons are then used to move the whole group to a location, that move should be applied to all individuals in the group (including those that were previously spawned as individuals): If members have already been spawned, they should be moved to the new location; otherwise, they should be spawned into the new location as normal. Per rule #4, all of their buttons corresponding to that location should be greenlit.
5. A new button should be generated just for the twirled-down individual subrows. It is disabled unless the individual has been spawned to a location, at which point it becomes interactable (but toggled off).  If it is toggled on, the button should change its color to red. This locks the individual into the area and slot that they currently occupy: If their group is moved via the master group-row controls, any individuals who have been locked in place should remain where they are.  **Wrinkle:** If the group is spawned to the _same_ location as a locked member, their positions will have to be rearranged to accomodate for the fact that an individual moved into a location will always occupy slot 1, which is potentially owned by a different member of the group (see the example below for clarification).

For example, consider `theFiveKeys` group.  There are five NPCs defined in the data that are members of that group, as follows (with irrelevant data omitted):

```lua
D.characters = {
  adrianVarga = {
    name = "adrianVarga",
    fullName = "Adrian Varga",
    labelColor = "#D1B200",
    groups = {
      fiveKeys = 2
    }
  },
  jesseSharp = {
    name = "jesseSharp",
    fullName = "Jesse Sharp",
    labelColor = "#D1B200",
    groups = {
      fiveKeys = 3,
      princesCourt = 9
    }
  },
  myleneHamelin = {
    name = "myleneHamelin",
    fullName = "Mylene Hamelin",
    labelColor = "#FFD900",
    groups = {
      fiveKeys = 1,
      princesCourt = 6
    }
  },
  stirlingSiskin = {
    name = "stirlingSiskin",
    fullName = "Stirling Siskin",
    labelColor = "#D1B200",
    groups = {
      fiveKeys = 4,
    },
  },
  zuriOluwusi = {
    name = "zuriOluwusi",
    fullName = "Zuri Oluwusi",
    labelColor = "#D1B200",
    groups = {
      fiveKeys = 5,
    },
  }
}
```

(Note: If an individual appears in multiple groups, they should appear under all relevant groups when twirled down, and any changes to their buttons (i.e. to their lock button, or greenlighting their location controls) should be reflected in all groups.)

From the above data, this is how "the Five Keys" twirledown should be built:

1. The background color of the row should be set to the labelColor of `myleneHamelin`, because she has `groups.fiveKeys = 1`. The foreground should be bold and black.
2. A VerticalLayout group containing all five members of the Five Keys should be created, but `active = false` by default. This is toggled on/off by the twirldown button to the left of the group label.
   2.a) The members of the group should be sorted in this submenu according to their `groups.fiveKeys` values, not their name.
   2.b) Each character's label should be colored in accordance with their `labelColor`, as usual.
   2.c) Any characters who have been spawned into the world should have the corresponding button set to green. (This includes when the entire group is moved: Any time an individual is spawned into the world, their location button should be greenlit.)
   2.d) A lock button should be added to the immediate left of the location buttons for each individual (not the group as a whole). Initially disabled/grey, when clicked it should turn red, locking that character to their current location.

Now, let's assume I take the following actions:

1. I spawn `stirlingSiskin` into the `centerForward` area using his individual controls. He will be spawned into slot 1 of `centerForward` (assuming the area was initially empty), as is the normal behavior for individual spawning. His `centerForward` button should be greenlit, and his lock button should be enabled but in the off state (grey).
2. I spawn `jesseSharp` into the `centerForward` area individually. He will be spawned into slot 2 of `centerForward`, the next available slot, as is the normal behavior for individual spawning. His `centerForward` button should be greenlit, and his lock button should be enabled but in the off state (grey).
3. I toggle on the lock button for `stirlingSiskin`, locking him in place, but I leave `jesseSharp` unlocked. `stirlingSiskin`s lock button turns red.
4. I then spawn the Five Keys as a group into the `nearLeft` area. All members of the Five Keys _except_ for `stirlingSiskin` will be spawned/moved into that area, and placed in the slot in accordance with their `groups.fiveKeys` values. `stirlingSiskin` will remain in `centerForward` at slot 1 -- unmoved, because his lock key was toggled.
5. Now, I move the Five Keys as a group to the `centerForward` area. Under current behavior, I _believe_ this would throw an error, since the current functionality requires that an area be completely empty before a _group_ can be moved into it. I'd like to change that to allow an exception for when a all members in the destination location are in the same group as the group being moved (i.e. the groups are being 'merged'). That should be permitted.
  5.a **Because `stirlingSiskin` is locked in slot 1**, the other four Five Keys members will be pushed into the next available slots: Normally, `myleneHamelin` would move into slot 1 -- but that is occupied by a locked-in-place `stirlingSiskin`. So, she will move into slot 2. `adrianVarga`, normally in slot 2, will then have to move into slot 3. `jesseSharp`, normally in slot 3, will likewise be moved into slot 4, which is `stirlingSiskin`'s normal slot. `zuriOlowusi` is normally in slot 5, so she can be safely moved into slot 5 since it is unoccupied. At the end of this process, all five members of Five Keys will have their "centerForward" buttons greenlit, and `stirlingSiskin` alone will still have his lock button red. _(Aside: There is no need to change the order of rows in the NPC panel or otherwise indicate_ which _slot `stirlingSiskin` or anyone else is in; this can easily be visually confirmed by everyone at the table.)_
  5.b **If I unlocked `stirlingSiskin` before I moved the Five Keys:** Because `stirlingSiskin` is not locked in place, he is free to move. Accordingly, all members of Five Keys will move into their _proper_ slots in the `centerForward` position: i.e. `stirlingSiskin` will be moved from slot 1 to slot 4, per his `groups.fiveKeys = 4` value. At the end of this process, all five members of Five Keys will have their "centerForward" buttons greenlit, and all five lock buttons would be grey.

## Implementing Ability to Spawn NPCs into Table Slots

Defer this bit for now, but it will be what we work on next so I want it on your radar.
