## Conditions Display & Management Overview

### Conditions in Player Data
It should be possible to add Conditions to state `playerData`. Data for Conditions added in this way should include:

- **`condition`**: The reference to the condition mechanics (in our conditions system) that should be applied while this Condition is active. **This is optional.** A condition in playerData without a `condition` reference should simply be displayed, as it lacks any associated coded functionality.
- **`appliedOn`**: A timestamp derived from the in-game present-day clock at the moment the condition was created.
- **`displayOnSheet`**: A boolean value that determines whether the Condition is displayed on the player's character sheet (see below). As a general rule, location conditions are never displayed on character sheets, nor are roll conditions associated with the type of roll (e.g. "No Take Half" on Discipline Rolls), or other types of transient conditions that are only present for a short duration (like the duration of a roll).
- **`displayType`**: If `displayOnSheet` is true, this value may specify one of the following categories, which will govern that background image as well as the character sheet page on which the condition will be displayed: `debilitation`, `theBeast`, `resonance`, `dyscrasia` and then `general` for all other Conditions.
- **`removalTrigger`**: This will be one of a limited number of values that determines when the Storyteller should be prompted (see below) to remove the Condition. Possible values include:
    1. `EndOfScene` - The ST should be prompted when the player leaves the current scene (whether because the scene ended, or because they are present at another scene that is transitioned to, or because the phase advanced from Play to Spotlight).
    2. `EndOfSession<#>` - The ST should be prompted at the beginning of the End phase if the session number matches the `<#>` in the removal trigger. E.g. `EndOfSession4` would prompt the ST to remove the condition at the end of `sessionNum = 4`.
    3. `<timestamp>` - The ST should be prompted at the first opportunity after nightfall on the in-game date given by `<timestamp>`. E.g. `<timestamp gives any time on Sept 4th, 2026>` = Disregard the hour/minute/second on the timestamp, and prompt the ST the first time the present day clock is at or after dusk on Sept 4th 2026
    4. `Manual` - There is no triggered removal prompt. The Storyteller will manage this condition manually, via controls in the Storyteller Dashboard (see below).
    5. `ChangeOfBlood` - This is really two triggers in one: The ST should be prompted to remove the condition when the player's Hunger either _decreases_ (indicating they have fed), or _reaches Hunger 5_.
- **`title`/`subtitle`/`description`/`duration`**: Strings to populate the Condition display XML when such condition is displayed on the sheet.

### Displaying Conditions on the Character Sheet
Several new elements have been put in place in the XML to facilitate displaying conditions, and their placement and manner of display depends on `displayType`.

#### `resonance`-Type Conditions
A `resonance` Condition consists of a single image reference, which is derived by combining the temperament of the resonance with the type of resonance:
    - **Type:** There are seven types of resonance: `"Choleric"`, `"Melancholic"`, `"Phlegmatic"`, `"Sanguine"`, `"Primal"`, `"Ischemic"`, and `"Mercurial"`
    - **Temperament:** There are three levels of temperament: `"fleetingly"`, `"intensely"`, and `"acutely"`.
* **Adding Resonance Conditions:** A new control on the tracker popup associated with each player on the Storyteller Dashboard should allow the Storyteller to add a Resonance condition to a player. The control should be a small button to the right of the player's hunger dotline that, when pressed, opens a small modal panel with a 3x7 grid of buttons, each corresponding to one of the possible combinations of resonance ("fleetingly Choleric", "intensely Choleric", etc.).
  - Clicking a button should apply the Resonance Condition immediately to the player.
  - Only one Resonance Condition can be applied to a player at one time: Selecting one should deselect and unapply any previously-selected resonance conditions.
  - Clicking an already-selected resonance button should remove it.
* **Displaying Resonance Conditions:** When a resonance condition is applied to a player, the `id="resonance_container"` element on page 1 of their sheet should be activated, and the `image` attribute of the `id="resonance_tag"` element should be set to `resonance_<temperament><type>`. For example, if the Storyteller activates the `"fleetingly Choleric"` resonance condition on a player, that image attribute should be set to `resonance_fleetinglyCholeric`.

#### `dyscrasia`-Type Conditions
Whenever the ST applies a resonance Condition to a player with `"acutely"` temperament, the ST should immediately be prompted to define a dyscrasia. There are two elements to a dyscrasia: a short title, and a short description of the effect. The Storyteller should be presented with input fields for both.
**Displaying Dyscrasia Conditions:** The `id="dyscrasia_container"` element on page 1 should be activated, the `id="dyscrasia_title"` text element should be updated with the dyscrasia title, and the `id="dyscrasia_description"` text element should be updated with the short description.

#### Other Complication Types
A separate control on the PC tracker popup (near the top right corner; visibly distinct from the resonance & dyscrasia condition control) should open a modal containing inputs for all of the fields described above:
- **`condition`**: A drop-down list containing all currently-defined condition keywords (including an empty/blank option for purely display conditions)
- **`displayOnSheet`**: A toggle checkbox, defaulting to checked/active/yes/true
- **`displayType`**: A drop-down containing three values: `"theBeast"`, `"debilitation"`, and `"general"`.
- **`removalTrigger`**: A drop-down containing "`EndOfScene"`, `"EndOfSession"`, `"ByGameClock"`, `"ChangeOfBlood"`, and `"Manual"`.
  - If `EndOfSession` is selected, three buttons should appear to the right of the dropdown. The first should display the number of the current session, the second should display the number after that, and the third should display the number after that (e.g. if it is currently Session 2, then these three buttons should show "2", "3" and "4"). The ST must select one before he can close the modal, at which point the full `EndOfSession<#>` value can be constructed.
  - If `ByGameClock` is selected, a button should appear to the right that will bring up a calendar for selection of the date; from this, the `<timestamp>` removal trigger can be derived.
- **`title`/`subtitle`/`description`**: Input text fields should be available for the ST to enter in values for these three text elements
- **`duration`**: An editable text field should be provided as above, but it should be populated with a default value once the ST has established the `removalTrigger`:
  1. `EndOfScene` - `"The end of the current scene."`
  2. `EndOfSession<#>` - `"The end of Session <#>."`
  3. `<timestamp>` - `"Nightfall on <shortDate, e.g. 'Sept 4th, 2026'>."`
  4. `ChangeOfBlood` - `"Until you Feed or Starve."`
  5. `Manual` - No placeholder. If the Storyteller leaves this blank, no duration should be displayed on the player's sheet.

**Displaying General Condition Types:** Page 2 can show up to eight conditions, in the order they were applied (sorted via `appliedOn`). A slot with no condition is not on the sheet. Title and subtitle use a text color of `white`, `gold`, or `red`. The card is filled as follows:
  - The `id="condition_container_<index>"` element should be activated
  - The `image` attribute of the `id="condition_container_<index>_background"` element should be set according to `displayType`:
    - `theBeast` = `bg_condition_theBeast`
    - `debilitation` = `bg_condition_debilitation`
    - all others = `bg_condition_general`
  - The `...title`, `...sub_title` and  `...description` text elements should be set to their corresponding input values.

### Prompting the Storyteller for Removal
When a `removalTrigger` fires, the Condition should not automatically be stripped from the sheet. Instead, the Storyteller should be presented with a confirmation box in the Storyteller Dashboard detailing the condition and the removal trigger having been met. This box  should allow a quick confirm (in which case the condition is removed and the corresponding XML  container is deactivated), as well as an edit button to allow the Storyteller to update the removal trigger. Finally, it should have a "Skip" button, the behavior of which depends on the `removalTrigger`:

1. Skipped `EndOfScene` and  `ChangeOfBlood`-type conditions should simply ignore the trigger but continues to listen for the next time conditions of the trigger are met.
2. `EndOfSession<#>` and `<timestamp>`-type conditions, if skipped, shoudl have their `removalTrigger` values changed to `Manual`.

## Agent Routing

Read this when:
- touching sheet condition cards, the Scenes seat resonance grid, or removal prompts

Source of truth:
- `playerData[playerId].personalConditions` (`lib/personal_conditions.ttslua`, `core/personal_conditions.ttslua`)
- `playerData[playerId].conditions` stays the mechanic map. A card's optional `condition` turns that mechanic on, and removing the card turns it off only when that card turned it on.
- Resonance and an optional dyscrasia share one card (`displayType = "resonance"`). Page 2 uses the other cards, eight on the sheet at a time. Title and subtitle take `textColor` `white`, `gold`, or `red`.
- A calendar removal is stored as `Clock:YYYY-MM-DD`. Dusk is Toronto sunset on that date.

Verification:
- `npx fengari .dev/scripts/personal_conditions.test.lua`
- Storyteller Dashboard Scenes tab: seat popup Resonance and Condition, and the due list

Status:
- current
