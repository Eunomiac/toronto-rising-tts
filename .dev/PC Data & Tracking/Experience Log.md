# Experience Log

Each player will have a running record of experience points gained and spent stored in their player data, and displayed on page 6 of their character sheet. The Storyteller will have the ability to add new records (of either experience gained or experience spent), by specifying the amount of XP gained/spent, and a short description explaining the origin of the gained XP or what the spent XP was used to purchase.

Experience log items will be grouped by session. With the exception of the current, live session, entries made during all previous sessions are locked in and will not need to change during play, and so they can be baked into the page 6 XML by dynamically generating it during the build process (much as other dynamically-generated character sheet information is handled). For the current, live session, a specific section of the XML will be set aside and filled with placeholder elements that can be activated and set during play via `setAttribute` calls (avoiding the need for `setXml` entirely).

## Recording New XP Log Entries

Our current system of treating player XP as a simple number that can increase or decrease is replaced with a more detailed record of gains and spends stored in each player's game state data.

On the PCs panel, the up, down and apply buttons (as well as the "+#" readout between them) will be replaced with a single button labeled "XP". When clicked, a popup modal will be presented to the Storyteller. It will list the name of the character for whom the modal was opened at the top, and it will have two input fields: One for the number (with negative numbers representing spends), and one for the description. At the bottom of the modal, there will be three buttons: "Apply", which validates and logs the XP entry to that player's state data; "Cancel", which closes the modal without making any changes; and "Apply to All", which will validate the data as with Apply, but it will log the entry to ALL players EXCEPT those who are marked as absent from the session.

## Player Data Record in `state`

Whenever the Storyteller logs a new entry into a player's XP log, the script should check the current session number against existing data in that log to see whether this is the first entry of a session, or if the entry should be added to an existing record for the current session (see #### Example of Stored XP Log Data, below).

### Creating the First Entry of a Session

If there does not exist an entry keyed to the current session number, a new record for that session should be created and the following fields derived:

* `"sessionDisplay"` — This string is always the word "Session" followed by the spelled-out session number, in title case (e.g. "Session One", "Session Thirteen", "Session Sixty-Five"). _(Before creating a custom function to convert the session number into a word, check the utilities library as I believe one already exists for this purpose.)_
* `"date"` — An `os.time()` timestamp of the current, real-world time. _(This value will only be used to display the date — e.g. "Sept. 15, 2026" — so the exact time at which it is captured doesn't matter)_
* `"gainTotal"` & `"spendTotal"` — The total amount of XP gained during this session, and the total amount of XP spend during this session. _(Initialize both to `0` when first creating a session block.)_
* `"prevTotal"` — The player's XP at the start of the session, which should be set to the player's XP value at the end of the previous session, and should not need to be changed after it is set.
* `"newTotal"` — The player's current XP, after adding `"gainTotal"` and subtracting `"spendTotal"` from `"prevTotal"`. This value (along with `"gainTotal"` and `"spendTotal"`) will need to be updated each time a new entry is created for this session.
* `"gains"` — An array of XP entries that were created with positive XP values during this session (i.e. representing gained XP), in the form `{"amount": <int>, "description": <string>}`.
* `"spends"` — An array of XP entries created with negative XP values during this session (i.e. representing spent XP), in the form `{"amount": <int>, "description": <string>}` (note: `"amount"` is always positive; the negative value should be removed once the entry is sorted into the `"spends"` bin)
* `"timeline"` — Append-order list of `{kind="gain"|"spend", amount, description}` used for sequential Undo in the ST modal; `gains`/`spends`/totals are derived from it.

### Adding New Entries to an Existing Live Session

If an entry already exists in the player's data for the current session number, add new entries to the appropriate bin and update the values of `"newTotal"`, `"gainTotal"` and `"spendTotal"`.

### Modal Undo

The XP modal shows the most recent timeline entry for the current session with an **Undo** button. Each Undo removes that entry and refreshes the strip so further sequential Undos work.

### Ids and bake

Element ids use a **session id token** derived from the session key: positive/zero stay as digits (`xp_sessionNum_2`), negatives use an `m` prefix so XmlUI ids stay safe (`-1` → `xp_sessionNum_m1`). Mid-week bake (`npm run csheet-xp-log:bake`) reads the latest TTS save’s `LuaScriptState`, writes finished sessions (`session key < gameState.sessionNum`, including negatives) into `lib/csheet_xp_log_baked.ttslua`, and stamps `bakedForSessionNum`. Live placeholders use that stamp’s session id. If `sessionNum` advances without a bake, warn the Storyteller only; the live placeholder block still receives current-session paint.

### Pre-session blocks (before Session One)

When Character Creation / prologue XP needs more than one page (~20 lines), split it across **negative integer** session keys, oldest first:

* `-2`, `-1`, then `0` (“Character Creation”), then `1` (“Session One”), …
* Always set `"sessionDisplay"` yourself on negative keys (e.g. `"Prelude"`, `"Chargen — Merits"`). The fallback title is `"Pre-Session One"` etc., which is rarely what you want.
* Chain `"prevTotal"` / `"newTotal"` across those blocks in authored order (more-negative → closer to zero).
* Do **not** use decimal keys (`0.1`); they floor to `0` and collide.

### Oversized sessions

Past sessions taller than 20 lines get one full page; excess gain/spend rows are cropped at bake time. Live sessions store more than 10 gains or spends in state but only show the first 10 slots (broadcast warning).

#### Example of Stored XP Log Data

A player's XP log in state might look like the following, during or after `sessionNum = 1`:

```jsonc
{
  "xp": {
    [0]: {
      "sessionDisplay": "Character Creation", // The sessionNum = 0 entry will be created directly; no need to handle creating entries in this session in the script.
      "date": 1789652600,
      "prevTotal": 0,
      "gainTotal": 35,
      "spendTotal": 20,
      "newTotal": 15,
      "gains": [
        {
          "amount": 35,
          "description": "Rollover Experience"
        }
      ],
      "spends": [
        {
          "amount": 10,
          "description": "(Out-of-Clan) Celerity 1 → 2"
        },
        {
          "amount": 7,
          "description": "Ritual: Invisible Chains of Binding 4"
        },
        {
          "amount": 3,
          "description": "Stealth 1"
        }
      ]
    },
    [1]: {
      "sessionDisplay": "Session One", // Derived from `sessionNum`
      "date": 1790257016, // `os.time()` when first entry is created
      "prevTotal": 15, // Equals the previous session's `"newTotal"`
      "gainTotal": 3, // A sum of the `"amount"` values in `"gains"`
      "spendTotal": 11, // A sum of the `"amount"` values in `"spends"`
      "newTotal": 7, // `"prevTotal"` + `"gainTotal"` - `"spendTotal"`
      "gains": [
        {
          "amount": 1,
          "description": "Attendance"
        },
        {
          "amount": 1,
          "description": "Compulsion Resolution: Paranoia"
        },
        {
          "amount": 1,
          "description": "Compulsion Roleplay: Paranoia"
        }
      ],
      "spends": [
        {
          "amount": 5,
          "description": "Athletics 1 → 2"
        },
        {
          "amount": 6,
          "description": "Mawla: Merrick Singh 1 → 3"
        }
      ]
    }
  }
}
```

## Display of XP Log on Character Sheet Page 6

The XP log in `page6.xml` displays every session in a paginated, vertical layout element, with sessions sorted in reverse order (with the current session appearing at the top).

### Displaying a Session

XP entries are grouped into sessions, and sessions are always displayed in full.  A session display contains three parts:

1. **The Title Bar** — Contains four elements:
  1.a. **Session Display Title** — The `"sessionDisplay"` value parsed into uppercase, e.g. `"SESSION ONE"`, `"CHARACTER CREATION"`
  1.b. **Session Date** — The `"date"` value parsed into a short date string of the form "Mm., d, yyyy", E.g. `"Sept. 24, 2026"`, `"May 1, 2026"`
  1.c. **XP Summation** — A concatenated string of the form: `"<prevTotal> XP + <gainTotal> − <spendTotal> ="`, omitting `"gainTotal"` or `"spendTotal"` if no such entries exist. E.g. `"5 XP + 6 − 1 ="`, `"0 XP + 2 ="`
  1.d. **XP Session Total** — `"newTotal"` for that session, displayed as a string of the form `"<newTotal> XP"`, e.g. `"10 XP"`
2. **The Gains List** — A single-column GridLayout, with each cell containing a complete entry from the `"gains"` bin. The cell itself contains two elements:
  2.a. **Gain Number** — The `"amount"` value, given the `+` sign and the suffix "XP", e.g. `"+1 XP"`
  2.b. **Gain Description** — The `"description"` string, written exactly as it is stored in state.
3. **The Spends List** — A single-column GridLayout, with each cell containing a complete entry from the `"spends"` bin. The cell itself contains two elements:
  2.a. **Spend Number** — The `"amount"` value, given the `−` sign and the suffix "XP", e.g. `"−1 XP"`
  2.b. **Spend Description** — The `"description"` string, written exactly as it is stored in state.

### Display of PAST Sessions

The XML displaying XP entries for previous sessions should be generated via XML templates and a build script, baking them into the compiled XML.

### Display of the CURRENT Session

Since new entries may be created during play, the currently-live session cannot be assembled beforehand during a build process. Instead, the build process should create enough elements to display ten "gain" and ten "spend" entries, then set them all inactive (as well as the title bar) until they are needed, at which point their values can be set via `setAttributes` and they can be activated by the script.

### XP Log Pagination

There is enough space on the character sheet XML to display exactly twenty lines of Experience Log data at one time. The title bar and the entries themselves are both the same height, so this twenty-line limit applies regardless of how many session title bars vs. XP entries are being displayed.  Two navigation buttons -- `id="xp_navigate_forward"` and `id="xp_navigate_back"` — allow the player to page through their experience log. When initially displayed, the first page should be shown (i.e. the page containing the most recent/current session at the top).

When breaking a player's XP log into pages, the following constraints apply:

1. A session requires a number of lines equal to one (for the title bar) plus the _higher_ of the number of "gain" entries or the number of "spend" entries. E.g. if a session has five entries in the `"gains"` bin and four in the `"spends"` bin, the session will require six lines to fully display.
2. A maximum of 20 lines can be displayed at one time.
3. Sessions cannot break across pages: If there is not enough room to display a session in full, it should be bumped to the next page.
4. Sessions without any entries should not be displayed at all.
5. Sessions should always be sorted in reverse order, with recent sessions appearing before older sessions in the list.

If a session cannot be displayed fully, it should not be displayed at all.

Finally, the navigation buttons should be hidden/deactivated when no more pages exist in that direction to turn to.