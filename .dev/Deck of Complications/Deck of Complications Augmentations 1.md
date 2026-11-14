# Deck of Complications Augmentations 1
I've added several new columns to the `EXPORT_COMPLICATIONS` data set (and updated the export contract accordingly), and I'd like you to implement the functionality associated with them.

## `Requires Pause`
Where this value is `TRUE`, behavior should continue as normal, with control being passed to the ST after the card is flipped, to wait for the ST to pass control back to the player.

Where this value is `FALSE`, control should not be passed to the Storyteller -- the player should be able to flip another card immediately.

## Automating Custom Conditions
The eight columns that begin with "Condition" are intended to supply all of the information needed to construct a custom Condition (i.e. in the same way the Storyteller can via the "Conditions" button on the Storyteller Dashboard player tracker popup). If `Requires Pause` is `FALSE` and there is custom condition data, the base (unenhanced) version of the condition should be applied to the player automatically when they flip the card. Otherwise, the base version of the condition should be applied when the Storyteller clicks the "Automate" button.

### Field mapping (Dashboard Conditions popup)

| Sheet column | Dashboard control | Allowed values / notes |
| --- | --- | --- |
| Condition Title | Title | Free text |
| Condition Subtitle | Subtitle | Free text |
| Condition Style | Look | **The Beast**, **Debilitation**, **General** (runtime ids: `theBeast`, `debilitation`, `general`). Blank → `general`. |
| Condition Color | Text color | **White**, **Gold**, **Red** (runtime ids: `white`, `gold`, `red`) |
| Condition Base / Enhanced Description | Description | Free text |
| Condition Base / Enhanced Duration | Ends + Duration | `Session:+N` (end of session `sessionNum + N`) or `Manual`. No Mechanic; always show on the sheet. |

### `Condition Base Description`, `Condition Base Duration`
These fields define the Description and Duration values for the unenhanced version of the condition, and are the default values that should be applied when a card is flipped or automated.

`Condition Base Duration` adopts a particular syntax to properly set the number of Sessions for the "Session" duration of a custom condition: `Session:+<#>`. The number provided should be added to the current session number to get the session number for the condition duration. For example, if it is currently `sessionNum == 2` and a duration value is `Session:+2`, the condition should be created with a duration of "Session 4".

### `Condition Enhanced Description`, `Condition Enhanced Duration`
As above, except applied when the Complication is Enhanced. When a Complication is Enhanced by the Storyteller during play, any base condition it previously applied should be removed, and replaced with the enhanced version. Conversely, if a Condition is un-enhanced by the Storyteller during play, any enhanced condition should be removed, and replaced with the base condition.

### `Dashboard Prompt`
When `TRUE`, clicking Automate opens the Conditions popup on the Storyteller Dashboard with all values filled in. The ST may edit before confirming; the condition is applied only on confirm. If `FALSE`, Automate applies the condition immediately with no Dashboard prompt. (Use the `<@DASHBOARD@>` live push channel — never `sendExternalMessage`.)

## Changes to the Automate Button
The Automate button that appears when control is passed to the Storyteller should be _hidden_ whenever there is no automation to apply (i.e. no custom condition data and no function calls). Its appearance is meant to indicate to the Storyteller that there is automation to perform, so it shouldn't be visible at all times.
