# Setting, Saving, and Loading PC State Data, and Refreshing XML Elements

## PC State Data: Current Structure

PC (and Storyteller) data is collected in the `playerData` table, where each player's data is keyed by their player ID number.  The current structure of each player's `playerData` entry is as follows:

```jsonc
    {
        "color": "Black", // The player's color, as a string
        "hud": PlayerHUDData, // The player's HUD data, saving overlay states and map location, is stored here. As changing this is beyond the scope of this document, it is not detailed here.
        "hunger": 0 // The player's hunger level, as a number from 0 to 5
    }
```

## PC State Data: Augmentation

1. The "hunger" field should be removed, as it will be folded into the data structures defined below.
2. The "stats" field should be added. The "stats" table will hold a variety of data relating to the current state of the character. Its definition will be built incrementally over the course of this document.

### Context Regarding the PCs' Character Sheets

To reduce the need for numerous dynamic XML elements to be present in the Character Sheet XML (so they can be toggled on/off as needed to display proper stat values), the majority of each PCs stats have been embedded into the image files that will be used for each page of the PCs' character sheets. Thus, it is unnecessary to dynamically activate each PC's entire range of stats; only when something *changes* will one of the `active="false"` elements in the Character Sheet XML need to be toggled to `active="true"`.

Nevertheless, for simplicity and clarity, a PC's full stat block will be stored in their `stats` table, and the necessary changes (i.e. dynamic XML elements) will need to be derived from this table.

### `PCStatsPartA`: `stats.attributes`, `stats.skills`, and `stats.specialties`

Both attributes and skills are simple 5-dot dotlines of matching size and shape. The only variation is in the position of each dotline on the sheet, and the addition of "specialties" to the skill dotlines.

Each attribute and each skill should be recorded in state following the following format:

```typescript
    type AttributeKey = "strength" | "dexterity" | "stamina" | "charisma" | "manipulation" | "composure" | "intelligence" | "wits" | "resolve";
    type SkillKey = "athletics" | "brawl" | "craft" | "drive" | "firearms" | "larceny" | "melee" | "stealth" | "survival" | "animalKen" | "etiquette" | "insight" | "intimidation" | "leadership" | "performance" | "persuasion" | "streetwise" | "subterfuge" | "academics" | "awareness" | "finance" | "investigation" | "medicine" | "occult" | "politics" | "science" | "technology";
    type SpecialtyType = "standard" | "archaic";
    interface Specialty {
        skill: SkillKey;
        type: SpecialtyType;
        name: string;
        decade?: number; // Only required for archaic skills.
    }
    interface BasicStat {
        base: number; // The base value of the attribute or skill, as a number from 0 to 5. This is the value that is "baked in" to the character sheet image.
        temp: number; // Any modification to the attribute or skill, such as a temporary bonus or penalty, is stored here. Dynamic updates to the character sheet will be triggered whenever this value is non-zero.
    }

    interface PCStatsPartA {
      attributes: Record<AttributeKey, BasicStat>;
      skills: Record<SkillKey, BasicStat>;
      specialties: Array<Specialty>;
    }
```

* For **attributes**, all nine attributes should be recorded in the `stats.attributes` table.
* For **skills**, all twenty-seven skills should be recorded in the `stats.skills` table.
* For **specialties**, an array containing one `Specialty` object for each of the PC's specialties should be recorded in the `stats.specialties` table.

#### Example: `PCStatsPartA`

```jsonc
    "stats": {
      "attributes": {
        "strength": {"base": 1, "temp": 0},
        "dexterity": {"base": 2, "temp": 0},
        "stamina": {"base": 2, "temp": 0},
        "charisma": {"base": 3, "temp": 0},
        "manipulation": {"base": 2, "temp": 0},
        "composure": {"base": 3, "temp": 0},
        "intelligence": {"base": 4, "temp": 0},
        "wits": {"base": 2, "temp": 0},
        "resolve": {"base": 3, "temp": 0}
      },
      "skills": {
        "athletics": {"base": 0, "temp": 0},
        "brawl": {"base": 0, "temp": 0},
        "craft": {"base": 0, "temp": 0},
        "drive": {"base": 0, "temp": 0},
        "firearms": {"base": 0, "temp": 0},
        "larceny": {"base": 1, "temp": 0},
        "melee": {"base": 1, "temp": 0},
        "stealth": {"base": 2, "temp": 0},
        "survival": {"base": 0, "temp": 0},
        "animalKen": {"base": 0, "temp": 0},
        "etiquette": {"base": 2, "temp": 0},
        "insight": {"base": 2, "temp": 0},
        "intimidation": {"base": 1, "temp": 0},
        "leadership": {"base": 3, "temp": 0},
        "performance": {"base": 0, "temp": 0},
        "persuasion": {"base": 3, "temp": 0},
        "streetwise": {"base": 0, "temp": 0},
        "subterfuge": {"base": 1, "temp": 0},
        "academics": {"base": 0, "temp": 0},
        "awareness": {"base": 2, "temp": 0},
        "finance": {"base": 1, "temp": 0},
        "investigation": {"base": 1, "temp": 0},
        "medicine": {"base": 0, "temp": 0},
        "occult": {"base": 3, "temp": 0},
        "politics": {"base": 2, "temp": 0},
        "science": {"base": 0, "temp": 0},
        "technology": {"base": 0, "temp": 0}
      },
      "specialties": [
        {
          "skill": "etiquette",
          "type": "standard",
          "name": "Muslims"
        },
        {
          "skill": "persuasion",
          "type": "standard",
          "name": "Camarilla"
        },
        {
          "skill": "politics",
          "type": "standard",
          "name": "Camarilla"
        },
        {
          "skill": "persuasion",
          "type": "standard",
          "name": "Negotiation"
        },
        {
          "skill": "leadership",
          "type": "standard",
          "name": "Inspiration"
        },
        {
          "skill": "investigation",
          "type": "archaic",
          "name": "Geneologies",
          "decade": 1910
        }
      ]
    }
```

### `PCStatsPartB`: `stats.health`, `stats.willpower`, `stats.humanity`, `stats.xp`, and `stats.bloodPotency`

* `stats.health`, `stats.willpower` and `stats.humanity` are 10-box boxlines of matching size and shape. They vary in their position on the character sheet, and in what needs to be dynamically tracked in `playerData.stats`, as shown below. **Importantly**, these stats have *not* been baked into the character sheet image; they are fully dynamic and the appropriate image for each slot will need to be toggled to the `active="true"` state.

```typescript
    interface HealthOrWillpower {
      base: number; // The base value of the PC's health or willpower, as a number from 0 to 10.
      temp: number; // Any temporary bonus or penalty to the PC's *base* health or willpower is recorded here. The actual value of the PC's base health or willpower is the sum of `base` and `temp`.
      superficial: number; // The number of superficial damage points the PC has sustained.
      aggravated: number; // The number of aggravated damage points the PC has sustained.
    }
    interface Humanity {
      base: number; // The base value of the PC's humanity, as a number from 0 to 10.
      temp: number; // Any temporary bonus or penalty to the PC's *base* humanity is recorded here. The actual value of the PC's base humanity is the sum of `base` and `temp`.
      stains: number; // The number of stains the PC has sustained.
    }
```

* `stats.xp` and `stats.hunger` are recorded as single `number` values.
* `stats.bloodPotency` is recorded as a `BasicStat` object, with the `base` value being the player's current blood potency (as baked into the character sheet image), and the `temp` value being the player's current temporary blood potency bonus or penalty.

```typescript
  interface PCStatsPartB {
    health: HealthOrWillpower;
    willpower: HealthOrWillpower;
    humanity: Humanity;
    bloodPotency: BasicStat;
    xp: number;
    hunger: number;
  }
```

#### Example: `PCStatsPartB`

```jsonc
    "stats": {
      "health": {
        "base": 5,
        "temp": 0,
        "superficial": 0,
        "aggravated": 0
      },
      "willpower": {
        "base": 6,
        "temp": 0,
        "superficial": 0,
        "aggravated": 0
      },
      "humanity": {
        "base": 6,
        "temp": 0,
        "stains": 0
      },
      "bloodPotency": {
        "base": 2,
        "temp": 0
      },
      "xp": 0,
      "hunger": 2
    }
```

### `PCStatsPartC`: `stats.disciplines`

At present, each discipline should be recorded as a `BasicStat` object, with the `base` value being the player's current discipline level (as baked into the character sheet image), and the `temp` value being the player's current temporary discipline bonus or penalty.

Future augmentation may enable the addition or removal of specific discipline powers, as text strings.

```typescript
  type DisciplineKey = "animalism" | "auspex" | "bloodSorcery" | "celerity" | "dominate" | "fortitude" | "obfuscate" | "oblivion" | "potence" | "presence" | "protean";
  interface PCStatsPartC {
    disciplines: Partial<Record<DisciplineKey, BasicStat>>; // Only disciplines that the player has should be recorded here, unlike attributes & skills.
  }
```

#### Example: `PCStatsPartC`

```jsonc
    "stats": {
      "disciplines": {
        "animalism": {
          "base": 2,
          "temp": 0
        }
      }
    }
```

### `PCStatsPartD`: `stats.backgrounds`, `stats.merits`, `stats.flaws`, `stats.bloodline` and `stats.loresheet`

To be implemented later. For now, lay the groundwork for these data structures by assigning them an empty array.

```typescript
  interface PCStatsPartD {
    backgrounds: Array<>;
    merits: Array<>;
    flaws: Array<>;
    bloodline: Array<>;
    loresheet: Array<>;
  }
```

### `PCStatsPartE`: `stats.conditions`

To be implemented later. For now, lay the groundwork for this data structure by assigning it an empty table. Conditions will be assigned by key, and removed by setting the value to `null`. The key for each condition should be a string, and the value should be an object with the following properties:

```typescript
  type ConditionKey = "torpor" | "impairedHealth" | "impairedWillpower";
  type HudKey = string; // The ID for the HUD element to be toggled via its "active" attribute
  type RemovalCriteria = "indefinite" | "afterNextRoll" | "onSceneEnd";
  interface Condition {
    statChanges: Partial<Record<AttributeKey | SkillKey | DisciplineKey | "bloodPotency", number>>;
    hudChanges: Partial<Record<string, boolean>>;
    lightingModeChanges: Partial<Record<string, boolean>>;
    gameObjectChanges: Partial<Record<string, boolean>>;
    removalCriteria: RemovalCriteria;
  }

  interface PCStatsPartE {
    conditions: Partial<Record<ConditionKey, Condition>>;
  }
```

## Dynamic HUD Updates

### Image Assets

Each dot or box on the PC's sheet can be modified by a single image asset positioned absolutely on the character sheet XML. All possible image assets have been defined in the Character Sheet XML, set to `active="false"` in the `<Defaults>` section.

Below, the dynamic modifications for each category of stat are described, and the corresponding `id`s of the image assets to be toggled are listed.

#### `stats.attributes`, `stats.skills`, `stats.disciplines`, and `stats.bloodPotency`

First, dynamically apply any applicable `statChanges` to the `"temp"` value of the corresponding stat. Then, using this updated `"temp"` value, follow the steps below to determine which of the five dots in the dot-line should be toggled "on" or "off".

* **When `"temp"` is zero:** No changes are necessary (there should be no dynamic elements on the sheet for this stat).
* **When `"temp"` is positive:** Determine which of the five dots in the dot-line should be toggled "on", and from that derive the ID of the image asset(s) to toggle: `id="dot_on_<attribute_or_skill>_<slot_number>"`. Then, toggle the `active="false"` element(s) with the corresponding `id`(s) to `active="true"`. (E.g., if `"attributes.strength.base"` is 3, `"attributes.strength.temp"` is 1, and the character has a condition with `"statChanges" = { "strength": 1}`, the fourth Strength dot should be toggled on --- three dots are baked into the sheet, and two additional dots have been activated by `"temp" = 1` and the condition. The ids of these elements are `dot_on_strength_4` and `dot_on_strength_5`, respectively.)
* **When `"temp"` is negative:** Determine which of the five dots in the dot-line should be toggled "off", and from that derive the ID of the image asset(s) to toggle: `id="dot_off_<attribute_or_skill>_<slot_number>"`. Then, toggle the `active="false"` element(s) with the corresponding `id`(s) to `active="true"`. (E.g., if `"bloodPotency.base"` is 3, `"bloodPotency.temp"` is 1, and the character has a condition with `"statChanges" = { "bloodPotency": -2}`, the third Blood Potency dot should be toggled off --- three dots are baked into the sheet, but one dot has been deactivated by `"temp" = 1` and the condition (which subtracts 2, for a total of -1). The id of this element is `dot_off_bloodPotency_3`.)

#### `stats.health` & `stats.willpower`

All boxes in the ten-box boxlines must be dynamically generated and absolutely positioned on the character sheet XML. The image assets to use for each box are determined by the values of `"base"`, `"temp"`, `"superficial"`, and `"aggravated"`, by following the steps below:

1. **Apply Conditions:** Apply any applicable conditions to the `"temp"` value of the corresponding stat, as described in the previous section.
2. **Determine Length of Boxline:** The length of the boxline is determined by the value of `"base"` + `"temp"`. This is the number of boxes that will need to be toggled to the `active="true"` state.
3. **Process Aggravated Damage:** Starting at slot 1, assign aggravated damage first, by activating an equal number of `id="box_agg_<tracker_key>_<slot_number>"` elements.
4. **Process Superficial Damage:** Starting at the next slot, assign superficial damage, by activating an equal number of `id="box_sup_<tracker_key>_<slot_number>"` elements.
5. **Process Remaining Boxes:** For any remaining boxes, activate an equal number of `id="box_on_<tracker_key>_<slot_number>"` elements.

##### Example: `stats.health`

Given the following state data:

```jsonc
    "stats": {
      "health": {
        "base": 5,
        "temp": 3,
        "superficial": 2,
        "aggravated": 3
      }
    },
    "conditions": {
      "poisoned": {
        "statChanges": {
          "health": -1
        }
      }
    }
```

The above steps would proceed as follows:

1. **Apply Conditions:** Apply any applicable conditions to the `"temp"` value of the corresponding stat, as described in the previous section. In this case, the condition `"poisoned"` has been applied, thus the relevant `"temp"` value of `3` has been decreased by 1,to `2`. (Importantly, do not modify the `"temp"` value in the state object, since this would result in the health penalty from the condition being applied twice.)
1. **Determine Length of Boxline:** The length of the boxline is determined by the value of `"base"` + `"temp"` (after applying conditions). This is the number of boxes that will need to be toggled to the `active="true"` state. In this case, `5 + 2 = 7` boxes need to be toggled.
2. **Process Aggravated Damage:** Starting at slot 1, assign aggravated damage first, by activating an equal number of `id="box_agg_health_<slot_number>"` elements. In this case, 3 boxes need to be toggled. The ids of these elements are `box_agg_health_1`, `box_agg_health_2`, and `box_agg_health_3`, all of which should be set to `active="true"`.
3. **Process Superficial Damage:** Starting at the next slot, assign superficial damage, by activating an equal number of `id="box_sup_health_<slot_number>"` elements. In this case, 2 boxes need to be toggled. The ids of these elements are `box_sup_health_4` and `box_sup_health_5`, all of which should be set to `active="true"`.
4. **Process Remaining Boxes:** For any remaining boxes, activate an equal number of `id="box_on_health_<slot_number>"` elements. In this case, 2 boxes need to be toggled. The ids of these elements are `box_on_health_6` and `box_on_health_7`, all of which should be set to `active="true"`.

The same process would be followed for `stats.willpower`.

#### `stats.humanity`

Similar to `stats.health` & `stats.willpower`, `stats.humanity` is a 10-box boxline, and none of the boxes have been baked into the character sheet image. However, instead of tracking superficial/aggravated damage, Humanity tracks Stains.The process for dynamically updating `stats.humanity` is as follows:

1. **Apply Conditions:** Apply any applicable conditions to the `"temp"` value of the corresponding stat, as described in the previous section.
2. **Determine Length of Boxline:** The length of the boxline is determined by the value `"base"` + `"temp"` (after applying conditions). This is the number of boxes that will need to be toggled to the `active="true"` state.
3. **Process Active Humanity Boxes from the Left:** Starting at slot **1**, assign active humanity boxes, by activating a number of `id="box_on_humanity_<slot_number>"` elements equal to the full length of the boxline (as determined in step 1).
4. **Process Stains from the Right:** Starting at slot **10** (i.e. the right side), assign stains, by activating an equal number of `id="box_stain_humanity_<slot_number>"` elements.
5. **Break On Collision:** If, during step 3, there is an active humanity box in a slot that would be activated as a Stain, stop, and convert that active humanity box into an "impaired" box by first deactivating the active humanity box, and then activating the `id="box_impaired_humanity_<slot number>"` element for that slot.

##### Example: `stats.humanity`

Given the following state data:

```jsonc
    "stats": {
      "humanity": {
        "base": 5,
        "temp": 2,
        "stains": 5
      }
    }
```

The above steps would proceed as follows:

1. **Apply Conditions:** Apply any applicable conditions to the `"temp"` value of the corresponding stat, as described in the previous section. There are none in this case, so the `"temp"` value remains at `2`.
1. **Determine Length of Boxline:** The length of the boxline is determined by the value `"base"` + `"temp"` (after applying conditions). This is the number of boxes that will need to be toggled to the `active="true"` state. In this case, `5 + 2 = 7` boxes need to be toggled.
2. **Process Active Humanity Boxes from the Left:** Starting at slot **1**, assign active humanity boxes, by activating a number of `id="box_on_humanity_<slot_number>"` elements equal to the full length of the boxline (as determined in step 1). In this case, 7 boxes need to be toggled. The ids of these elements are `box_on_humanity_1`, `box_on_humanity_2`, `box_on_humanity_3`, `box_on_humanity_4`, `box_on_humanity_5`, `box_on_humanity_6`, and `box_on_humanity_7`, all of which should be set to `active="true"`.
3. **Process Stains from the Right:** Starting at slot **10** (i.e. the right side), assign stains, by activating an equal number of `id="box_stain_humanity_<slot_number>"` elements. In this case, 5 boxes need to be toggled. The ids of these elements are `box_stain_humanity_10`, `box_stain_humanity_9`, `box_stain_humanity_8`, `box_stain_humanity_7`, and `box_stain_humanity_6`, all of which should be set to `active="true"`.
4. **Break On Collision:** If, during step 3, there is an active humanity box in a slot that would be activated as a Stain, stop, and convert that active humanity box into an "impaired" box by first deactivating the active humanity box, and then activating the `id="box_impaired_humanity_<slot number>"` element for that slot. In this case, upon reaching the fourth stain (`box_stain_humanity_7`), we collide with the last humanity box (`box_on_humanity_7`). Thus, we stop processing stains and instead toggle off `box_on_humanity_7` and toggle on `box_impaired_humanity_7`.

(Note that the above process proceeds inefficiently by activating and deactivating image assets in sequence. A more efficient approach would be to identify which mode each slot should be and then activate the appropriate image for each in one action.)

### Text Assets

#### `stats.specialties`

To be implemented later.

#### `stats.xp`

The `text` attribute of the `<Text id="xp_text">` element must always be set to the player's current XP level, as a number, including "0".

## Storyteller Controls

The main Storyteller control panel includes a placeholder "PCs" panel. It is now time to implement at least part of the functionality of this panel.

There are five PCs, each of which should occupy a single vertically-spaced row in the PCs panel. This panel should display the player's name, and a vertical bar indicating their player color.  Each player cell should contain the following:

### Health & Willpower Controls

* **Health Tracker Display:** A `<Text>` object with the `text` attribute set to render a simplified version of the player's health tracker, using `O` for full boxes, `X` for aggravated damage, and `/` for superficial damage.
* **Aggravated Damage Control:** A red "▲" button and a red "▼" button, with a `<Text>` element separating them, displaying "+0" by default. Pressing the "▲" button should increase the value in this display by 1, and the aggravated damage value by 1. Pressing the "▼" button should decrease the value in this display by 1, (allowing negative numbers). Alone, these buttons should not change the player's state: This is simply a way for the Storyteller to set the amount of damage/healing that will be applied..
* **Superficial Damage Control:** Located horizontally on the same row as the Health Tracker Display and Aggravated Damage Control, a grey "▲" button and a grey "▼" button, with a `<Text>` element separating them, displaying "+0" by default. Pressing the "▲" button should increase the value in this display by 1, and the superficial damage value by 1. Pressing the "▼" button should decrease the value in this display by 1, (allowing negative numbers). Alone, these buttons should not change the player's state: This is simply a way for the Storyteller to set the amount of damage/healing that will be applied.
* **Apply Button:** Located horizontally on the same row as the Health Tracker Display, Aggravated Damage Control, and Superficial Damage Control, a green "Apply" button. Pressing this button should apply the current values in the Aggravated Damage Control and Superficial Damage Control to the player's state, and reset the displays to "+0".
* **Willpower Controls:** Located directly beneath the health controls described above, willpower controls should be presented in the same format.

#### Applying Superficial & Aggravated Damage

Globally-available functions for modifying player health and willpower trackers should be created in an appropriate library. These functions should accept a player reference (name, color, ID, or object), a number for superficial damage (negative for healing), and a number for aggravated damage (negative for healing). These functions should then apply the rules of Vampire: the Masquerade 5th Edition, along with the recorded data describing the player's current health/willpower state, to determine the new state of the player's health/willpower.

Generally, adding damage is simply a matter of increasing/decreasing the `"superficial"` or `"aggravated"` values in the player's state. However, there are some exceptions and special cases to consider:

* **Healing Exceeds Damage:** Damage values cannot be negative. If the amount of healing requested exceeds the amount of damage, the damage should be set to zero, with any excess healing ignored.
* **Total Damage Exceeds Total Boxes:** If the total amount of damage (i.e. `"superficial" + "aggravated"`) would exceed the total number of boxes in the player's health/willpower tracker (i.e. `"base" + "temp"`, after applying any conditions), the following steps should be followed:

1. **Apply All Possible Damage:** First, apply the maximum amount of damage possible to the player's health/willpower tracker (i.e. the amount that can be applied without exceeding the total number of boxes in the player's health/willpower tracker). At this point, all active boxes should be damage boxes (either aggravated or superficial). Track the amount of damage left over after this step.
2. **Convert Superficial to Aggravated:** For each point of excess damage (regardless of whether it is superficial or aggravated), convert one of the player's *existing* superficial damage boxes into an aggravated damage box, until the entire tracker is filled with aggravated damage boxes. Any excess damage after this point should be ignored.

##### Assigning & Removing Conditions After Applying Damage/Healing

Three conditions depend on the amount of damage a player has suffered to their Health and/or Willpower trackers:

* **Torpor:** A character gains the "Torpor" condition if the amount of Aggravated damage they have sustained to their Health tracker equals their current health tracker length (i.e. `"aggravated" = "base" + "temp"`). A player only loses the "Torpor" condition when the above is no longer true (i.e. they have been healed of at least one point of aggravated damage) *and* the Storyteller manually toggles the "Torpor" condition off.
* **Impaired Health**: A character gains the "Impaired Health" condition if the total amount of damage they have sustained to their Health tracker (regardless of type) equals their current health tracker length (i.e. `"superficial" + "aggravated" = "base" + "temp"`). A character loses the "Impaired Health" condition automatically when they receive enough healing such that the above is no longer true, OR if they receive the "Torpor" condition (which supercedes the "Impaired Health" condition).
* **Impaired Willpower**: A character gains the "Impaired Willpower" condition if the total amount of damage they have sustained to their Willpower tracker (regardless of type) equals their current willpower tracker length (i.e. `"superficial" + "aggravated" = "base" + "temp"`). A character loses the "Impaired Willpower" condition automatically when they receive enough healing such that the above is no longer true, OR if they receive the "Torpor" condition (which supercedes the "Impaired Willpower" condition).

These conditions are applied to the player's `"conditions"` table as follows:

```lua
  conditions = {
    torpor = {
      statChanges = {},
      hudChanges = {
        ["overlay_torpor_" .. playerData.color] = true
      },
      lightingModeChanges = {
        ["PLAYER_LIGHT_2_" .. U.upper(playerData.color)] = "OFF"
      },
      removalCriteria = "indefinite"
    },
    impairedHealth = {
      statChanges = {
        strength = -2,
        dexterity = -2,
        stamina = -2
      },
      hudChanges = {
        ["overlay_health_impaired_" .. playerData.color] = true
      },
      lightingModeChanges = {
        ["PLAYER_LIGHT_2_" .. U.upper(playerData.color)] = "DIM_RED"
      },
      removalCriteria = "indefinite" -- Still controlled automatically, by the damage/healing functions described above.
    },
    impairedWillpower = {
      statChanges = {
        charisma = -2,
        manipulation = -2,
        composure = -2,
        intelligence = -2,
        wits = -2,
        resolve = -2
      },
      hudChanges = {
        ["overlay_willpower_impaired_" .. playerData.color] = true
      },
      lightingModeChanges = {
        ["PLAYER_LIGHT_2_" .. U.upper(playerData.color)] = "DIM_RED"
      },
      removalCriteria = "indefinite" -- Still controlled automatically, by the damage/healing functions described above.
    }
  }
```

The `"removalCriteria"` for each condition should be set to "indefinite" if the condition is controlled automatically, by the damage/healing functions described above. Otherwise, the `"removalCriteria"` should be set to the appropriate value.

### Humanity Controls

* **Humanity Tracker Display:** A `<Text>` object with the `text` attribute set to render a simplified version of the player's humanity tracker, using `O` for full boxes, `_` for empty/unused boxes, and `*` for stains.
* **Stain Control:** A purple "▲" button and a purple "▼" button, with a `<Text>` element separating them, displaying "+0" by default. Pressing the "▲" button should increase the value in this display by 1, and the number of stains by 1. Pressing the "▼" button should decrease the value in this display by 1, (allowing negative numbers). Alone, these buttons should not change the player's state: This is simply a way for the Storyteller to set the number of stains that will be applied.
* **Apply Button:** Located horizontally on the same row as the Humanity Tracker Display and Stain Control, a purple "Apply" button. Pressing this button should apply the current values in the Stain Control to the player's state, and reset the displays to "+0".
* **Clear Button:** Located horizontally on the same row as the Stain Control, a purple "Clear" button. Pressing this button should clear all stains from the player's state, and reset the displays to "+0".
* **Humanity Control:** A black "▲" button and a black "▼" button. Clicking either immediately increases or decreses the player's Humanity score by 1 (no apply button or modifier displays are needed for this control).

#### Applying Stains

Stains should be applied as described in the section "##### Example: `stats.humanity`", above. The "Impaired Humanity" condition should be applied to the player's `"conditions"` table if that procedure results in the player having an impaired humanity box, and it should be removed when enough Stains have been removed to no longer impair that character's humanity:

```lua
  conditions = {
    impairedHumanity = {
      statChanges = {
        strength = -2,
        dexterity = -2,
        stamina = -2,
        charisma = -2,
        manipulation = -2,
        composure = -2,
        intelligence = -2,
        wits = -2,
        resolve = -2
      },
      hudChanges = {
        ["overlay_humanity_impaired_" .. playerData.color] = true
      },
      lightingModeChanges = {
        ["PLAYER_LIGHT_2_" .. U.upper(playerData.color)] = "DIM_PURPLE"
      },
      removalCriteria = "indefinite" -- Still controlled automatically, by the conditions described above.
    }
  }
```

### XP Controls

* **XP Tracker Display:** A `<Text>` object with the `text` attribute set to render the player's current XP level, as a number.
* **XP Control:** A blue "▲" button and a blue "▼" button, with a `<Text>` element separating them, displaying "+0" by default. Pressing the "▲" button should increase the value in this display by 1, and the player's XP level by 1. Pressing the "▼" button should decrease the value in this display by 1, (allowing negative numbers). Alone, these buttons should not change the player's state: This is simply a way for the Storyteller to set the player's XP level.
* **Apply Button:** Located horizontally on the same row as the XP Tracker Display and XP Control, a blue "Apply" button. Pressing this button should apply the current value in the XP Control to the player's state, and reset the display to "+0".
