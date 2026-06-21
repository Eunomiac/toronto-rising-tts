
- [Mission-Critical Feature] **Projects System:** This is a feature that allows the creation of Projects by players or the Storyteller, approval of Projects by the Storyteller, setting and logging of staked Advantages, setting and synchronizing the Increment and Project Die with the in-game clock, displaying each project on the player's character sheets, etc.

### Projects System

#### Data Storage Schema

Project data should be stored in the `playerData` of the player who made the Launch roll, as well as any players who participated via Teamwork. Each project will be stored in a table by a randomized alphanumeric ID:

```lua
{
  id = "string", -- An 8-character alphanumeric ID, randomly determined at creation.
  principal = "lucien", -- Character key of primary character (i.e. the character making the Launch roll)
  participants = { "lucien", "myleneHamelin" }, -- Character keys of participating characters; can include NPC keys as well as PC keys; does include principal
  scope = 3, -- An integer value defined by user.
  interval = "day", -- One of "day", "week", "month", "year", "decade", "century". Defined by user.
  goal = "To persuade the University Chantry to resume warding Camarilla properties.", -- A one-sentence string defined by user.
  notes = {}, -- Array of strings of extra data added by Storyteller or players.
  gmNotes = {}, -- As above, but only accessible by the Storyteller.
  stakedAdvantages = { -- Defined by Storyteller. To accurately locate an advantage within pc or coterie data, focus must sometimes be defined in addition to name. NPC advantages are defined in the same way, but are not linked to any data (and are defined arbitrarily by Storyteller)
    coterie = { -- Coterie data is stored in state under `coterieData`, and will include tables for `backgrounds`, `merits` and `flaws`, just like playerData does currently.
      {
        name = "Resources",
        qty = 3
      }
    },
    lucien = {
      {
        name = "Status",
        focus = "Clan Toreador",
        qty = 1
      },
      {
        name = "Resources",
        qty = 3
      }
    },
    myleneHamelin = {
      {
        name = "Mawla",
        focus = "Stirling Siskin",
        qty = 2
      }
    }
  },
  isValid = true, -- Initially false, set to `true` when all above schema data has been provided.
  isApproved = true, -- Initially false, until Storyteller approves the Project.
  launchRollFailures = 0, -- Initially zero, incremented each time a Launch roll results in a failure.
  launchRollResult = "criticalWin", -- User data provided by Storyteller after the player makes their Launch roll.
  launchRollMargin = 5, -- User data provided by Storyteller after the player makes their Launch roll.
  -- Note: If supplied launchRollResult is a failure, the below data is not required -- the project is 'finished' without really having been started. The record should still be kept in state.
  committedAdvantages = {}, -- Blank in this case (on a Critical Win Launch roll, players do not have to commit any of their staked Advantages), but on a normal Win, this will be a list of committed Advantages in the same format as the stakedAdvantages table, above.
  startTime = 1790041690, -- A timestamp representing the in-narrative time the Project was launched; provided by Storyteller after Launch roll.
  steps = {
    [10] = 1790041690,
    [9] = 1790128090,
    [8] = 1790214490,
    [7] = 1790300890,
    [6] = 1790387290,
    [5] = 1790473690,
    [4] = 1790560090,
    [3] = 1790646490,
    [2] = 1790732890,
    [1] = 1790819290,
    [0] = 1790905690,
  }, -- Helper function (see below) run when `startTime` and `interval` are available to get ten steps of Project die and the completion date at Project Die = 0.
  goalRollSuccesses = null, -- If the players attempt to rush the project with a goal roll, the number of successes rolled by the players should be written here.
  projectDieRollSuccesses = null, -- If the players attempt to rush the project with a goal roll, the number of successes rolled by the Storyteller's opposing Project Die roll should be written here.
  isResolved = false, -- Set to 'true' when project is completed
}

-- getStepTimestamps(startTime, interval)
-- Gets timestamp values for the ten steps of a project, starting from the startTime and incrementing by the interval.
-- startTime: A timestamp logged from the current _displayed_ value on the clock (not necessarily live time) when the project was created.
-- interval: One of "day", "week", "month", "year", "decade", "century". Defined by user at creation.
-- returns: A table of (approximate) timestamps in the form of projectDie/timestamp key/value pairs.
function getStepTimestamps(startTime, interval)
  local projectDie = 10
  local steps = {}

  local function getIntervalSeconds(intervalRef)
    local intervals = {
      day = 24 * 60 * 60,
      week = 7 * 24 * 60 * 60,
      month = 30 * 24 * 60 * 60,      -- Approximate!
      year = 365 * 24 * 60 * 60,      -- Non-leap, approximate
      decade = 10 * 365 * 24 * 60 * 60,
      century = 100 * 365 * 24 * 60 * 60,
    }
    return intervals[intervalRef]
  end

  local intervalSeconds = getIntervalSeconds(interval)
  while projectDie > -1 do
    local stepTime = startTime + (10 - projectDie) * intervalSeconds
    steps[projectDie] = stepTime
    projectDie = projectDie - 1
  end
  return steps
end
```

Note that it will be possible to "create" incomplete Projects with missing schema fields -- players may want to work on projects iteratively before submitting completed versions for Storyteller approval. (A Project cannot be started until all data has been logged.)

#### Project Creation

Creating a project requires getting the necessary user data to complete the data schema, then storing the project in state.

- if the project's `principal` is a PC, the project data should be stored in a `projects` array under their `playerData` entry.
- if the project's `principal` is an NPC, the project data should be stored in an `npcProjects` array in state (perhaps under the main `npcs` element, if there is one)

The creation pipeline works slightly differently for players vs. the Storyteller

##### Project Creation by Storyteller

Project creation by the Storyteller will be handled by a new Storyteller panel called "Projects" (alongside "Scenes", "PCs", "Phases", and "Sound"). This panel will be dynamically generated via piecemeal templates, much as the Storyteller roll dashboard is currently done. The XML partials will be designed by myself first, and in there I will define in more detail how user data is provided. The pipeline will operate as follows:

[ Storyteller Clicks "Add Project" ] -> [ Modal Popup for Entry of Schema Elements ] -> [ Storyteller Submits, Data Validated; Modal only Closes on Validation Success, Data Logged to state ]

Note that the Validation process run at this step should allow incomplete/missing data -- only on bad data should it hold the modal open. This modal can be opened by the Storyteller at a later point via an "EDIT" button next to the project displayed in the "Projects" panel. The modal should be populated with all existing data, and allow the storyteller to add/change data.

Each time the modal is submitted, the Project should be checked for completeness. If all data has been validated, an "APPROVE" button on the "Projects" panel should be enabled (initially it should be greyed/inactive). Clicking this sets `isApproved` to `true`, resulting in display of the project on the sheets of all PC `participants` and completing the Project Creation process.

##### Project Creation by Players

Players will be able to create a project by clicking on the "Projects" header on page 5 of their CSHEETS.  They will be shown the same modal that the Storyteller gets, and will be able to enter any amount of Project data.

After submitting the modal (following same "bad data" validation as the Storyteller), the Project will be displayed on their sheet. If data is missing, it will be displayed in the style of a working draft; only when all data is present and valid will a "Submit" button allow submitting the Project to the Storyteller for approval. This will add it to the Storyteller's "Projects" panel at the top, visually emphasized, and give it the same "EDIT" / "APPROVE" buttons to change or approve the project, completing the Project Creation process.

#### Launching a Project

Once created, the project must be launched with a Launch roll. A "LAUNCH" button should appear in the "Projects" panel next to any project that has been "APPROVED". This initiates a Launch roll for the `principal` player (if a PC) OR a Storyteller Launch roll if the `principal` is an NPC.

The Launch roll is assembled just like a Standard Roll is, with the following modifications (most, if not all, of which are already configured, I believe):

- Willpower cannot be spent to reroll dice
- Blood Surge is not available
- Take Half is not available

The Difficulty of the Launch Roll is always the `scope` + `2` + `launchRollFailures`.  The Launch roll will need to be tied to the Project it is launching (by the project's ID) so that, upon the Storyteller Confirming the roll, the result and margin can be written to the project data (or `launchRollFailures` can be incremented by one, if the roll failed).

On a FAILURE, TOTAL FAILURE, BESTIAL FAILURE, or TOTAL BESTIAL FAILURE, `launchRollFailures` is increased by one, so that the player can try again but the Difficulty will be increased by 1.
On a CRITICAL WIN or MESSY CRITICAL, `committedAdvantages` is set to an empty table (`{}`), and the launch config modal is opened for the Storyteller to confirm final details and launch the project.
On a WIN, the launch config modal is opened for the Storyteller to enter in `committedAdvantages` as well as other final details before launching the project.

The launch config modal will include a confirmation of the start time. Once launched, `steps` should be calculated and written to state, and the clock events log should be updated with all ten steps (see "#### Clock Management", below).

After the Launch roll has been resolved, if any `committedAdvantages` come from player sheets, the display of those advantage dots should be changed from

#### Project Lifecycle

A Project's lifecycle is largely driven by the clock -- the "Project Die" is a countdown from 10 to 0.  The Project Die should always display the number associated with the earliest timeStamp that is later than the current clock. For example, if the current clock time is `1790493256`, which is between `[5] = 1790473690` and `[4] = 1790560090` in the example steps in the schema above, the Project Die should display `5`. If the current clock is at an earlier time than `[10] = 1790041690`, the Project should not be displayed at all (it hasn't been launched yet). If the current clock is at a later time than `[0] = 1790905690`, the project should be flagged for completion in both the player-facing display and the storyteller's "Projects" panel.

A Project can be completed at any time by the Storyteller, regardless of the value of the Project Die, via a "COMPLETE" button next to the Project in the "Projects" panel, which should only be interactable once the Project has been launched.

##### Rushing a Project: The Goal Roll

Once a Project has been Launched AND the Project Die is between 10 and 1, a "RUSH" button should be available on both the player UI and the storyteller UI.  Clicking this button initiates a Goal roll (which must be confirmed by the Storyteller as with any other roll) for the `principal` (player or NPC), AS WELL AS open a Storyteller roll named "Project Die". _(This may result in two Storyteller rolls being initiated simultaneously. In this case, the `principal`'s roll should be done first, i.e. made the live roll. If an NPC wants to rush a project, however, this will require two live SToryteller rolls -- the attempt should be rejected if there are not at least two available storyteller drawers, one for each roll)_

* The **Goal Roll** -- The Goal Roll is assembled by the player as if it were a Standard Roll, with the following changes:

- Willpower cannot be spent to reroll dice
- Blood Surge is not available
- Take Half is not available
- Pairs of 10s do NOT form criticals: A pair of 10s is worth 2 successes, just like any other pair of successes, and results of CRITICAL WIN or MESSY CRITICAL are not possible.
- The Difficulty is 0. The number of successes rolled should be written to the `goalRollSuccesses` field of the project data.

* The **Project Die Roll** -- This is always a Storyteller roll named "Project Die" with a dice pool equal to the current value of the Project Die:  If the Project Die is a 6, then the Project Die Roll is a roll of 6 Standard Dice.

- Criticals work as normal for the Storyteller's Project Die Roll
- The Difficulty is 0. The number of successes rolled should be written to the `projectDieRollSuccesses` field of the project data.

When both `goalRollSuccesses` and `projectDieRollSuccesses` have been written, the final result of the goal roll can be determined and broadcast: The `projectDieRollSuccesses` define the Difficulty of the Goal Roll. The `goalRollSuccesses` should be compared to this Difficulty, and a result and a margin determined as with any other roll.

On a WIN, the Project Die is immediately decremented by an amount equal to the MARGIN on the successful Goal Roll. The `steps` table should be modified by reducing the value of every key by that amount, and removing any entries where this reduces the key to a negative number. As described in "Project Lifecycle", above, if this results in the current clock being later than the `steps.[0]` timestamp, the project should be flagged for completion.

On a FAILURE, BESTIAL FAILURE, TOTAL FAILURE, or TOTAL BESTIAL FAILURE, the following steps should be performed:

1. If the Launch Roll result was a Critical Win, nothing happens. `goalRollSuccesses` and `projectDieRollSuccesses` should be cleared.
2. Otherwise, compare the margin of failure to the total value of `committedAdvantages`.
  IF the absolute value of the margin is greater than the total value of `committedAdvantages`,


#### Project Display

Projects will be displayed in the form of boxed XML elements derived from partials that I will create myself. In those files I will more-accurately define how projects should be displayed. Projects will be displayed on:

1. All PC participants CSHEETS, on page 5
2. The "Projects" Storyteller panel
3. The "Court" sidebar reference panel (yet to be completed)

####




#### Clock Management

Since the clock can advance rapidly (during a lerp'd fast forward, for example), we can't have it checking every logged project for step times on every tick. Thus, an ordered table of timestamps representing "events" on the game timeline (i.e. linked to the clock) should be maintained in state. All ten steps of every project created should be added to this ordered table, as should anything else added by future features that create similar events linked to the clock. This way the clock only has one source of data to monitor while advancing.