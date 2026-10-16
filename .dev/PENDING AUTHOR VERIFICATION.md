# Pending Author Verification

Your TTS checklist for shipped work that still needs Save & Play / in-game confirmation. Issues listed here should be **Awaiting Author Review** in Linear.

**Marks** (prefix the `####` header):

| Mark | Who | Meaning |
| --- | --- | --- |
| **✅** | Author | Confirmed in TTS — agents remove on next inbox |
| **❌** | Author | Still broken (+ **Author Comment:**) |
| **⚠️** | Author | Bad expectations (+ **Author Comment:**) |
| **⏰** | Agent | Not ready to verify yet — fix is open in Linear / Focus; **do not** Save & Play for this row until the watch is cleared |
| **🚫** | Author | Irrelevant or obsolete - feature being tested is to be replaced by the Storyteller Dashboard; follow-up validation of this issue can be discarded (see **Author Comment**s for more details on how to handle the Linear issue) |

Unmarked = shipped (or verification gate) and waiting for your first pass. Agents add a new unmarked row and set Linear to **Awaiting Author Review** whenever they ship in-game code. They process your **✅** / **❌** / **⚠️** marks on the next inbox. A **✅** moves the Linear issue to **Fully Complete** by default, or **Complete (KEEP)** when its Linear history should be retained. Agent policy: [PENDING AUTHOR VERIFICATION.agent.md](PENDING AUTHOR VERIFICATION.agent.md).

Some rows cover two or three issues that are tested together (the header lists every id). Mark such a row **✅** only when every step passes; otherwise mark it **❌** and say which step failed.

---

## Outstanding

_Last populated: 2026-10-15 (Scenes DnD TOR-733 + Cloud asset harmonization). Almost everything below assumes the dashboard is running. Restart it once (`npm run dev`) after pulling new code, then Save & Play. For the Cloud asset rows, run `npm run build:full` once with Steam on and TTS closed before the first Save & Play, then reload the Toronto Rising save._

### High — Scenes drag-and-drop

#### TOR-733 — Scenes DnD rolls bridge (secret-safe, reveal, duplicate)

**How to verify:** Restart the Storyteller Dashboard (`npm run dev`), then Save & Play so `dashboard.rolls` reloads.

1. On the Scenes tab, right-click a seated PC or a staged NPC. Edge slide-out panels should animate in on the left / bottom / right. Drop (or click) **Standard Roll** on Panel A and confirm a roll starts in TTS.
2. Run an NPC roll as secret. On Panel A, try **SECRET-SAFE: Broadcast** — players should not see dice faces. Then **Reveal & Broadcast** (or Reveal Quietly) and confirm the outcome becomes visible as intended.
3. Finish a PC roll, then drag that roll card onto the stage board. It should broadcast to the table.
4. Optional: drag a staged NPC onto an empty chair — they should seat (lit), not leave a duplicate on the stage.

### High — Cloud assets (local `assets/` → Steam Cloud)

These four rows share one build. Close TTS, run `npm run build:full` with Steam running, reload the save, then Save & Play. Mark each row only after its own steps pass.

#### TOR-728 — NPC art from Steam Cloud (figurines, tokens, roll banners)

**How to verify:** After the build and Save & Play above:

1. Put Benedict Kincaid (or another catalogued NPC) on the stage. The figurine and its spotlight token should look normal.
2. Start a roll for that NPC. The roll banner should show their figure (the Custom UI name is now `rollFigure_<key>`, not the bare character key).
3. Seat a PC. Their seat figurine should match the character.
4. On the Storyteller Dashboard roster, open an NPC: the headshot and token should still appear (they are served from `assets/NPC Art/` on disk).

#### TOR-729 — Dice faces, companion toggle and Blood Potency marks

**How to verify:** After the same build and Save & Play:

1. Draw a normal die and a Hunger die from a player's bag. Both faces should look as before.
2. Flip a companion toggle on the table. Its faces should still change.
3. On a character sheet, change Blood Potency (or look at the Page 1 / Page 2 Blood Potency marks). The surge / mending / discipline marks should still show the right art.

#### TOR-732 — Site cards, district cards and skyboxes

**How to verify:** After the same build and Save & Play:

1. On the location overlay, open a known site card (for example a downtown site). The card art should appear.
2. Open one of the seven cards that were new to TTS: Hockey Hall of Fame, Underground Med Clinic, or any of the five Warrens sites. Those should now show Cloud art instead of a blank or GitHub fallback.
3. Switch the skybox from the Scenes tools to a few named skies and to Generic. The sky should change; named skies should match the sheet keys.

#### TOR-730 — HUD art, character sheet faces and Global panels

**How to verify:** After the same build and Save & Play:

1. Open the map, the right sidebar and a couple of reference panels (Coteries, Prince's Court, Frenzy). Icons and panels should look as before.
2. Advance a session far enough to show a blindfold overlay. Blindfolds 1–32 (including 8, which was missing from the mirror) should all work.
3. Open each PC's character sheet pages. The front and back faces should match that character; Page 5 project dice and the Prince's Court large yellow dots should still look right.
4. Known gap: Color Blitz has toggle buttons but no reference panel image yet. Clicking that coterie popup will show a blank until you drop `refPanel_Coteries_colorBlitz.webp` into `assets/HUD/CorePanel_Center/Coterie References/` and rebuild.

### High — session / join

#### ⏰ TOR-439 — Join-stress re-verify after Global HUD remount weight cut

**Status:** Linear **In Progress** (verification gate; code already shipped). Needs other people at the table — not a solo Save & Play.

**How to verify:** Run the multiclient playbook in [TOR-439-join-xml-spike-verify.md](Step-By-Step Playbooks/TOR-439-join-xml-spike-verify.md). On the Host, arm the minimal join XML, have the struggling client connect, then restore in stages. Watch **step 2 (HUD / Refresh UI)** especially: after the TOR-444 remount-weight cut, does that client stay connected through the full Global HUD remount? Optionally also try a normal (unarmed) join to see whether the Arm pipeline is still needed at all.

### High — dashboard pins from 2026-10-13

These four rows have no Linear issue yet: the Linear connection was down when they shipped. An agent will file them and add the ids here.

#### Scatter Mode fixes — trays, groups, Compulsion cards

**How to verify:** Save & Play, start the Play phase, and switch to Scatter.

1. **Seating on entry:** before switching, seat two or three NPCs between PCs on a wood table. After the switch, all five PCs should be in five different groups, and the seated NPCs should stand on the NPC arcs around the groups, not in PC spots.
2. **Trays:** start Storyteller NPC rolls for NPCs in two different groups. Each tray should rise level, turned only to face its group. Clear one roll from the dashboard: that tray should drop out of sight and its light should go off. Start another roll for that group: the tray should come back level.
3. **Dashboard follows the player:** open a player's in-game group strip and click a different group. Within about a second, the dashboard's Scenes tab should show that PC in the new group.
4. **Compulsion card:** give a player a chosen Compulsion, then move them to another group. The card should travel with their sheet and bags.

#### Table chairs are drawn once per session

**How to verify:** Save & Play.

1. From Intermission, advance to Play. Under the cover, the PCs should land in a newly shuffled order on Table B.
2. Play two or three library scenes on Table B, then End Scene. Every PC should keep the same chair each time, with any NPCs seated after the PCs (chairs 6 and up).
3. Advance through Spotlight and End back to Intermission: the chairs should still match. Advance to Play again: only now should the PCs get a new order.
4. Disconnect a PC and reconnect them on Table B: they should return to their own chair.
5. On Table B, drag a PC onto another PC's chair in the dashboard seat row: they should swap. Play another scene or End Scene: both should keep their new chairs. Dragging a PC past chair 5 (or an NPC into chairs 1–5) should be refused with a short message.

#### NPC token names and stage token order

**How to verify:** with Steam running and TTS closed, run `npm run build:full` from the repo root (it redraws every token, uploads the art to Steam Cloud and updates the links), then Save & Play.

1. Put Benedict Kincaid, Severin Koslov and a Guard Ghoul on the stage. Their Stage Control tokens should show full names on both sides.
2. Clear the stage and add several NPCs. From the Storyteller seat, the first token should appear in the top-left corner of the board, then fill to the right, then down.

#### Project launch rolls open for the player

**How to verify:** Save & Play with the dashboard running. On the PCs tab, open a player's Projects and add a project. The fields still needed glow gold; fill them in until **Roll** lights up, then click it. The roll should appear in the dashboard Rolls column with its difficulty set **and** open on that player's screen, without re-picking the difficulty.

### High — NPC Stats (pin 19)

These rows have no Linear issue yet: the Linear connection is down. An agent will file them and add the ids here.

#### Generic NPCs get a stat tier

**Context:** Each generic type (every "Police" figurine, say) now has up to four stat blocks: Weak, Average, Gifted and Deadly. A generic added to a scene remembers which one it uses, and shows it as a small badge.

**How to verify:** restart the dashboard (`npm run dev`), then Save & Play.

1. In the Scenes tab roster, open **Generic**, right-click any Police token and click **Stats**. Fill in at least the Health box on the **Average** and **Deadly** tabs (any numbers), then click off to save.
2. Click a Police token in the roster. A small "which tier?" window should open with Average and Deadly. Pick Deadly. The token goes into the Send queue (its line should say "Deadly") and onto the stage with a Deadly badge at its top-left. Send.
3. In TTS nothing looks different, but on the dashboard the stage token and its "In this scene" token should both show the Deadly badge. Seat it in an empty chair: the seat should show the badge right of the chair number.
4. Right-click the in-scene token, change **Tier** to Average, click off, and Send. The badges should switch to Average.
5. Save & Play again: the badge should still be there (the tier is saved with the scene).
6. Give a different generic type only one tier block, then click one of its tokens: it should go straight onto the stage with that tier, no picker.

#### NPC trackers: Health, Willpower, Hunger and Rage on the dashboard

**Context:** Every NPC on the table now has trackers that TTS keeps, like a PC's: Health and Willpower damage, plus Hunger (vampires) or Rage (werewolves), which start at 1 or 2. Named NPCs keep theirs for the rest of the night (a new night starts them fresh); a generic NPC keeps its own with the scene it is in.

**How to verify:** restart the dashboard (`npm run dev`), then Save & Play.

1. Give a named vampire NPC a stat block (right-click it in the roster, **Stats**: kind Vampire, Health 5, Willpower 4). Put that NPC on the stage and Send.
2. Click the NPC's stage token once, without dragging. A small trackers window should open by the token, showing 5 Health boxes, 4 Willpower boxes and a row of five Hunger dots with 1 or 2 filled. Double-clicking the token should still light or darken it, without opening the window.
3. Click the Health row. The damage ring opens: left-click **Superficial** twice and **Aggravated** once. The boxes should fill to match within a second or so. Right-click **Superficial** to take one away.
4. Left-click the Hunger row until it reaches 3. A small red droplet with a "3" should appear at the top-right of the stage token. Seat the NPC: the droplet should show at the top-right of the seat too, and clicking the seat should open the same trackers window.
5. Do the same with a werewolf NPC (kind Werewolf in Stats): the window should show a Rage row instead of Hunger, with an orange droplet at 3 or more.
6. Add a generic NPC, damage it, then play a different scene and come back to the first one: the generic's damage should still be there. Advance the clock past the next dusk: the named NPC's trackers should start fresh (no damage, Hunger 1 or 2) the next time it appears.
7. Play a scene whose clock is set to present day and repeat step 2. The trackers window should work, and the TTS console should show no "[NpcTrackers] Could not resolve tonight's dusk" error.

#### NPCs roll from their stat blocks

**Context:** An NPC with a stat block can now roll straight from it: pick a pool, attack or power and the dashboard builds the dice (Hunger or Rage dice included, discipline bonus, every rouse check). Blood Surge is a live on/off droplet on the roll card, and a Storyteller roll will not roll until a difficulty (or **–** for none) is picked. A failed rouse check raises the NPC's own Hunger, not the Storyteller's. The broadcast shows one line such as "Marcus attacks with Brawl (Claws)". Spending Willpower on a reroll costs the NPC 1 superficial Willpower, and vampires get a **Mend** button on their Health.

**How to verify:** restart the dashboard (`npm run dev`), then Save & Play.

1. Give a named vampire NPC a stat block: kind Vampire, Blood Potency 2 (their Hunger comes from the trackers window). Add a pool (for example Brawl 6), an attack using it with a +2 bonus, and a Potence power at level 1 with 1 rouse check and the Brawl pool. Also add an Oblivion power with 1 rouse check and no pool (passive).
2. Put the NPC on the stage, right-click its stage token and start a roll. On the NPC roll card, click the new **Roll from the NPC's stats** icon. A window should list the pool, the attack and the powers, each showing the dice it would roll; hovering one explains the breakdown. Notes from the stat block show at the bottom.
3. Click the attack. The dice should appear in TTS with as many red Hunger dice as the NPC's Hunger. Roll. If it wins, the broadcast should read "<name> attacks with Brawl (<attack name>)", ending with the attack name and "+2".
4. Start another roll and pick the Potence power. The roll should include one rouse die. If that rouse die fails (1–5), the NPC's Hunger in their trackers window should go up by one, and the Storyteller seat's Hunger should **not** change.
5. Pick the passive Oblivion power: it should roll only the rouse check (an Oblivion rouse die), finish by itself, and broadcast "<name> activates …".
6. Blood Surge is now an on/off switch, like a player's surge bag. Start a Standard or Discipline roll for the vampire NPC and pick a pool. On the roll card's icon column there is a hollow blood droplet: click it. It should turn solid red and glow, and the pool should gain the Blood Potency's surge dice (red Hunger dice first, up to the NPC's Hunger) plus one rouse die, without picking the pool again. Click it again: those dice should come back out and the droplet goes hollow. The **Blood Surge** button in the "roll from stats" window does the same thing and stays in step with the droplet; with Blood Surge on, picking a different pool or power keeps it on. Roll with it on: if the surge's rouse die fails, the NPC's Hunger goes up by one.
7. After a roll, pick some dice on the NPC roll card and click **Reroll the picked dice**: the NPC's Willpower should take 1 superficial damage in the trackers window, once per reroll. (Every picked-dice reroll on an NPC roll now counts as their Willpower reroll; rerolls of a player's dice charge nobody.)
8. Open the vampire's trackers window, click Health and pick **Mend**: a rouse check rolls by itself and the NPC heals the Blood Potency's mend amount of superficial damage.
9. Roll a power with rouse checks with the difficulty set to **–** (no difficulty), and confirm it. Every failed rouse check should still raise the NPC's Hunger (this used to be skipped when a roll had no difficulty: Mara's Arms of Ahriman rolls on 2026-10-13 failed three checks and her Hunger stayed at 1).
10. Start a new NPC roll and pick a pool, but do not pick a difficulty. The Roll and Take Half icons should be greyed out, and hovering Roll should say "Pick a difficulty first (– for none)". The difficulty strip's first cell now reads **–** instead of 0. Click **–**: the strip folds to "vs. –", Roll lights up, and the roll comes out as a plain count of successes. Picking a power that changes the roll type (for example a Discipline power on a Standard roll) should keep the difficulty you already chose.

#### Keep a generic NPC as a character

**Context:** A generic NPC who turns out to matter (say "Officer Bradley", a Police figurine) can now be kept as a character. They get their own stat block (copied from their tier), keep their name, and can be brought back into later scenes from the roster. Their trackers carry from scene to scene for the rest of the night. TTS keeps no list of kept characters; the dashboard does.

**How to verify:** restart the dashboard (`npm run dev`), then Save & Play.

1. Add a Police generic to the scene with a tier (as in "Generic NPCs get a stat tier"), name it, Send, and give it some Health damage in its trackers window.
2. Right-click its "In this scene" token in the roster. Click **Keep as a character**: the button should turn to "Kept as a character", the Tier select disappears, and **Stats** now opens a single stat block (not four tabs) with the tier's values already filled in. The damage should still be there.
3. Play a different scene. In the roster's **Generic** view, a **Kept** list should show the character by name. Click them: they go into the Send queue on their figurine, then Send. They should appear on the stage with the same name, and their trackers window should still show the damage from step 1.
4. Right-click them in "In this scene", click **Kept as a character** once (it turns red, "Click again: delete their stats") and once more. They become a plain generic again and disappear from the Kept list.

### High — NPCs and dice no longer wait under the table

#### TOR-707 — NPC figurines and spotlights spawn when a scene needs them

**Context:** The ~90 NPC figurines and spotlights that used to sit in a hidden grid under the table are gone. An NPC now exists only while it is on the stage, in a seat, or in Scatter: it is created when a scene brings it in and destroyed when it leaves. Seated NPCs no longer carry a stage spotlight. The **4 Figurines** join-restore button on the Phases panel was removed (restore is now 1 Assets, 2 HUD, 3 Emitters).

**How to verify:**

1. Save & Play. Type `lua DEBUG.retirePreloadPools()` once in the Host console. It prints one line counting the old preload NPC records, figurines and lights, the parked dice, and the old board's `CB_` pieces it removed (expect 13 board pieces; the record count may be 0 because the first load already cleared those NPCs). Then **File → Save** and load again: running the command a second time should report 0 for everything, and the load should feel no slower than before.
2. Play a library scene that has several NPCs on the stage and at least one NPC in a seat. Behind the blindfold, the stage NPCs should appear in place showing their pictures (not blank white cards) with their spotlights; the seated NPC should appear in the chair with its seat lights and no extra spotlight hovering over it.
3. Play a different scene with a different cast. NPCs who are not in the new scene should disappear, and the new scene's NPCs should appear in place.
4. Mid-scene, from the dashboard, add an NPC who is not in the scene onto the stage and Send. Expect a short pause (a second or two) and then the NPC appears already in place, picture loaded, with its spotlight. Moving an NPC who is already on the stage should still glide immediately, as before.
5. Seat an NPC from the dashboard, and in Scatter move an NPC into a group: both should work with the same short pause the first time that NPC enters the world.
6. Add a generic NPC from the dashboard roster, put it on the stage and Send: it should appear after a short pause with the name you typed. Save & Play: it should still be on the stage with that name.
7. Advance into the Spotlight phase: stage NPCs should disappear. Go back to play the scene: they should come back.

#### TOR-708 — Dice are taken from the bags when you roll

**Context:** The parked dice under each bag are gone. When a roll stages, each die is taken out of the bag; when the roll is cleaned up, the dice are destroyed.

**How to verify:**

1. The parked dice are cleared by the same one-time `lua DEBUG.retirePreloadPools()` command in step 1 of the NPC check above; nothing extra to run here.
2. At a player seat, roll a normal pool: the dice should appear at the bag and tray exactly as before, roll, and show the result. Watch the moment the dice come out of the bag: note whether you see a brief flash of a blank or wrong-looking die (the old parked dice existed to hide that flash). When the roll is cleared, the dice should disappear.
3. Start a roll and cancel it before rolling: the staged dice should disappear.
4. Roll, then use a Willpower reroll: the highlighted dice should be grabbable, and after the reroll finishes no die should keep a blue glow.
5. Left-click the Rouse bag and roll: same as before. Roll a pool with Hunger dice: the red dice should come out of the Hunger bag as before.
6. After several rolls, nothing should pile up under the table, and no console errors should appear.

#### TOR-709 — Every NPC's figurine and spotlight token now comes from the repo

**Context:** Every NPC (named, generic and Memoriam) now gets its figurine picture, one shared figurine back, and a newly drawn spotlight token from GitHub instead of Steam Cloud. Each token shows the NPC's head (using your dashboard crop when you set one), the NPC's name in Bebas Neue, and a ring in the NPC's roster colour. The face-down side is a black silhouette with a black ring. The hand-made tokens are gone. The per-NPC back and token images were removed from the save's Custom UI assets (a backup copy of the save is in your backup saves folder). The images the roll result banner uses (one per PC, named NPC and Memoriam figure, named after the character) are now written by the same build step and point at the repo figurines; when a figurine is removed from the repo, its banner image is removed from the save too. Figurines that are in no catalog get no token or banner image, and the end of the Full build lists them along with catalogued NPCs that have no figurine yet.

**How to verify:**

1. Load the save fresh from the main menu (**File → Load**) before saving anything, so TTS does not write the removed images back into the save from memory. Then Save & Play. There should be no console errors. If the console lists generic NPCs with no art, those are catalogue rows that have no figurine image yet.
2. Play a library scene with named NPCs on the stage. Their figurines should show their pictures, and the back of each figurine should show the shared back image. On the Stage Control board, each NPC should have a round token with its name and a coloured ring. Flip one face down: it should show a black silhouette with a black ring and the name.
3. From the dashboard, add a generic NPC, put it on the stage and Send. Its figurine and token should appear, with the catalogue name on the token.
4. Enter a Memoriam that features one of the figures that has art (for example Prince Doran). Its figurine should show its picture and the shared back.
5. Roll for a named NPC from the dashboard, and roll at a player seat: each result banner should show that character's picture. (Generic NPCs show no picture on the banner.)
6. Run `npm run build:full`: the very last thing it prints should be a boxed list of NPC art discrepancies (five figurines in no catalog and seven Memoriam figures with no image, at the moment).
7. Once the above passes, tidy Steam Cloud in Cloud Manager: delete the **Vampire the Masquerade 5E/NPC Cutouts** and **Toronto Rising/NPCs** folders. Nothing uses them any more.

#### TOR-710 — NPC name tooltips follow the light; token tooltips; PC figurines use Minimal Collider

**Context:** Hovering a stage or Scatter NPC figurine now shows its full name only while that NPC is lit (standard light, spotlight, or held spotlight). When its light is off, hovering shows nothing. Since your 2026-10-11 pin, this works by switching the figurine's **interactable** setting with its light, with the tooltip left on all the time, because TTS only shows tooltips on interactable objects. Figurines stay locked, so players can right-click a lit one but cannot select or drag it. Seated NPCs keep their tooltip as before (and stay non-interactable). Stage tokens always show the NPC's full name on hover, including a name you changed on the dashboard. The five player seat figurines now have **Minimal Collider** turned on; that was changed directly in the save file (a backup copy is in your backup saves folder).

**How to verify:**

1. Load the save fresh from the main menu (**File → Load**) before saving anything, then Save & Play. Right-click a player seat figurine: under its custom settings, **Minimal Collider** should be ticked. Check one NPC figurine: it should be unticked.
2. Put two named NPCs on the stage, one lit and one with its light off. Hover each: the lit one shows its full name, the dark one shows nothing.
3. Toggle the dark NPC's light on: hovering now shows its name. Turn it off again: the name goes away.
4. Hold the spotlight hotkey on a dark NPC's token: while held, hovering the figurine shows its name; after release it goes back to showing nothing.
5. Move a lit stage NPC into a chair: hovering it there still shows its name.
6. Hover a token on the Stage Control board: it shows the NPC's full name. Rename a generic NPC on the dashboard and Send: its token's hover name should change to the new name.

#### TOR-712 / TOR-713 / TOR-714 — Table B scene change, stage NPC stays dark, NPC reroll not pushed

**Context:** Three fixes from your 2026-10-11 dashboard pins. Switching to a Table B scene was sized from the scene leaving the table instead of the one arriving, so an NPC in chair 6 was refused (TOR-712). Dragging a lit seated NPC onto the stage left its figurine dark in TTS, because the spotlight step kept waiting on the figurine object from before its size change (TOR-713). An NPC reroll could get stuck waiting on one die and never update the dashboard (TOR-714).

**How to verify:**

1. Save & Play. With a scene on the table that seats only the five PCs, use the dashboard's Play a Scene window to switch to a library scene on Table B with an NPC in chair 6. It should play on the six-chair table, with no refusal banner.
2. Seat an NPC at the table, light their seat (double-click it on the dashboard), then drag the seat onto the stage. Within a second or two the figurine on the stage should stand lit under its spotlight.
3. Roll for an NPC from the dashboard, pick two or three dice and click Reroll. When the dice land, the dashboard's dice and result should update by themselves, without clicking Recalculate.

#### TOR-715 — Secret Storyteller rolls keep the pool hidden

**Context:** From your 2026-10-11 pins. A secret roll's dice are now hidden from players from the moment they appear and are never revealed. Players glimpse a random handful as the first throw is made, and every rerolled die while it tumbles. The result banner shows only the dice the result gives away.

**How to verify:** You need a second client or a hotseat player seat to watch, because the Storyteller always sees the dice.

1. Save & Play. Start a Storyteller roll of about 10 dice and right-click **Roll**.
2. From the player seat: no dice should be visible on the drawer tray before the throw. As they are thrown, a few (roughly 3 to 8) should flash into view and vanish before they land. The Storyteller sees all 10 throughout.
3. Pick two dice and reroll them: from the player seat, both should be visible while they tumble, then vanish.
4. Confirm with a left-click so the banner shows. The player should see only the successes (6 and up). On a messy critical they all show as Hunger dice; on a bestial failure, the successes show as normal dice plus the Hunger 1s; on a total failure, no dice.
5. Clear the slot: the dice disappear for the Storyteller and never appear for the player.

#### TOR-716 — Stage Control tokens in rows by stage area

**Context:** From your 2026-10-11 pin. The Stage Control board's spotlight tokens now spawn in rows grouped by stage area instead of at each NPC's stage spot. They are bigger (1.5 scale) and upright from your seat. After spawning, a token never moves; light changes only flip it.

**How to verify:**

1. Save & Play. Load a scene with NPCs in two or three different stage areas.
2. On the Stage Control board, the tokens should be large and upright from the Storyteller's seat. They should sit in rows across the board, grouped by area, with a slightly wider gap between areas.
3. Move an NPC to another stage area on the dashboard and Send: its token should stay where it is.
4. Turn an NPC's light off and on from the dashboard: its token flips face down and face up without moving.
5. Hold the spotlight hotkey over a token: the NPC is spotlit as before.

#### TOR-717 — NPC token settings window (name, colour, crop, card scale, seated height)

**Context:** From your 2026-10-11 pin. Right-clicking a roster token in the dashboard opens a settings window for that NPC. The name and colour change the dashboard and the spotlight token art. The name, card scale and seated height reach TTS through a generated file. Seated figurines still use card scale 53, so card scale only changes the figurine on the stage.

**How to verify:**

1. Restart the Storyteller Dashboard task, because its server has a new save endpoint. In the Scenes tab, open the roster and right-click an NPC token. The settings window opens with the NPC's current name and default values shown in grey.
2. Type a new name, pick a colour, set Scale to 65 and Seat Y to -52, then click off the window. The roster token shows the new name and ring colour straight away.
3. Close TTS and run `npm run build:full` with Steam running, then Save & Play.
4. Place that NPC on the stage. Its figurine is bigger and carries the new name, and its spotlight token shows the new name and ring colour.
5. Seat the NPC at the table. The figurine sits at the new height.
6. Right-click the token again, clear every field and click off. Regenerate and Save & Play: everything is back to the defaults.

#### TOR-711 — Compulsion badge on the dashboard seats

**Context:** From your 2026-10-11 pin. A PC with a selected Compulsion card now shows a red tag on their dashboard seat naming the Compulsion. Hovering the tag shows the card's real Influence, Burden and Catharsis text, read from your `compulsions.jsonc` file (the 36 cards you extracted and numbered).

**How to verify:**

1. Restart the Storyteller Dashboard task, because its server has a new endpoint. Save & Play.
2. Have a PC draw a Compulsion and pick one of the four cards. Within a second their seat on the dashboard's Scenes tab shows a red tag with the Compulsion's name. A clan card shows the clan's Compulsion (for example Judgment for the Banu Haqim PC), not "Clan".
3. Hover the tag. A box opens above the seat with the name and card number, then the Influence, Burden (with its italic flavour line) and Catharsis, each with its title. Compare it with the card the player picked: the text should match that card, not one of the other three.
4. Draw the selected card back into the player's hand. The tag disappears.

### High — startup, table and hunger (eye checks only; your traces already confirmed the speed-ups)

#### TOR-670 / TOR-671 — Startup does one full sync and lifts the cover once

**How to verify:** Load an **Intermission** save from the main menu: the table should come up dark with the Intermission theme playing. Then load a **Play-phase** save from the main menu: the session-start cover should stay down for the whole load and lift only once, after the table is fully laid out (no flash of a half-built table). When it lifts, chairs, NPCs, seat lights and overlays should look right, hunger bags should be hidden, every dice drawer (players' and Storyteller's) should be closed, and nobody's seat should be stuck in the bright rolling light, even if the save was made mid-roll. No console errors.

#### ✅ TOR-667 / TOR-669 — Table changes and no-change syncs leave the right things alone

**How to verify:** Change tables once from the dashboard's table drop-down: chairs, NPC seat objects and each PC's selected Compulsion card should all land in the right places. Then send a couple of ordinary stage moves from the dashboard and watch the rest of the table: NPCs you did not move should not blink, and no preload NPCs or preload dice bags should appear on the table. Finally switch the table to Scatter and back: hidden preload NPCs should stay hidden throughout.

#### ✅ TOR-672 / TOR-681 — Hunger overlay updates once, on one seat, and never flickers

**How to verify:** Play a scene with a PC whose Hunger is above zero and turn on the real-time clock (any speed). Watch that player's hunger overlay for two or three minutes: it should stay perfectly still. Then change that PC's Hunger up and then down (Storyteller PCs panel or the dashboard sheet): their overlay and hunger smoke should switch straight away each time, and no other seat should change. If a PC has a project in progress, open sheet page 5 and move present day forward a whole day: the project's countdown die should still update.

### High — character sheets, Storyteller panels and live dashboard updates

**Trace setup:** two of these rows still owe one trace each. Make sure **Trace Sync** (Debug panel button) is **grey** while you set up, click it **yellow**, do the Trace Actions, click it grey again, and paste the console into `.dev/Performance Audits/Trace Sync/Refinement Pass 3/` under the file name given.

#### TOR-677 — One refresh per seat change; character sheets skip pages that didn't change

**Context:** Trace 1 (Hunger and Health from the PCs panel) passed. Trace 2 refreshed one page too many; that is fixed, so only Trace 2 needs re-running.

**Trace 2 — a trait edit from the dashboard** (save as `TOR-677 Trace 2.txt`)

* **Initial Conditions:** the dashboard's **PCs** tab shows Pink on pages **III · IV**, and Pink has at least one Merit or Background.
* **Trace Actions:** On page III, click the dots beside Pink's first Merit (or Background) to open the ring. **Left-click Temp** once, then **right-click Temp** once, then click empty space to close the ring.

  Each Temp click should show one `Sync.player` block whose `PCST.refreshCharacterSheetsForColor` line lists `pages=3` only.

**By eye:** use each button on one player's row in the Storyteller PCs panel (Health and Willpower damage, Humanity stain and base, Hunger, Frenzy, Blind, Desire clear, Torpor clear): the row and that player's sheet should both update. From that player's seat, make rolls that cause a Rouse stain, a Remorse check, a failed Frenzy and a Willpower reroll: the sheet should follow every one. Move a project stake on a Background or Merit: page 3 should show it. Change the session number on the Phases panel: page 6 (Experience Log) should follow.

**Note (TOR-721):** the in-game PCs panel and the Phases panel's session number field are gone. Make the PCs-panel changes from the dashboard's **PCs** tab instead, and change the session number from the dashboard.

#### TOR-678 — Backup Storyteller panels only refresh while they're open

**Context:** Trace 1 (everything closed) passed. Trace 2 showed the open/close logic backwards; that is fixed.

**Note (TOR-721):** the in-game **PCs** panel this trace relies on has been removed (the dashboard's PCs tab replaces it), so Trace 2 can no longer be run as written. The **By eye** check still applies to Scenes, Stats and Projects. You may want to mark this row 🚫.

**Trace 2 — toolbar hotkey and closing a tab** (save as `TOR-678 Trace 2.txt`)

* **Initial Conditions:** the Storyteller **PCs** panel is open, the **Storyteller toolbar (toggle)** hotkey is bound (Options → Game Keys), the Debug panel is open, and the dashboard's **PCs** tab shows Pink on pages **I · II**.
* **Trace Actions:**
  1. Press the toolbar hotkey. The toolbar disappears.
  2. On dashboard page I, click Pink's **Health** tracker, **left-click Superficial** once, then click empty space.
  3. Press the hotkey again. The toolbar comes back, and Pink's PCs row should already show the new damage.
  4. Open the Health ring again, **right-click Superficial** once, close the ring. The PCs row should update live.
  5. Click the lit **PCs** tab to close the panel.

  Step 2 should show `PCST.refreshRow skipped reason=hidden`, step 3 `PCST.refreshAllRows ran`, step 4 `PCST.refreshRow ran`, and step 5 no `PCST.refreshAllRows` after the close.

**By eye:** open each panel (PCs, Scenes, Stats, Projects) by clicking its tab: each should show current values the moment it opens.

#### TOR-676 — TTS pushes seat changes to the dashboard

**Context:** Your trace confirmed the TTS side. The dashboard missed the pushes because TTS silently drops nested tables in external messages; they now travel as a JSON string. No trace needed.

**How to verify:** Open the dashboard's **PCs** tab. In TTS, change a player in ways the dashboard didn't cause: damage from the in-game PCs panel, a Rouse stain from a roll, and a new Desire typed on the sheet (it updates when you click out of the field). The dashboard should follow each within about a second without a page refresh. Edit a project in TTS: dashboard page 5 should refresh. Reload the save: the dashboard should refresh once on its own. Last, stop the dashboard server and play for a few minutes: TTS should not stutter.

**Note (TOR-721):** the in-game PCs panel is gone. For the "damage the dashboard didn't cause" step, use a roll (a Rouse stain) or a Desire typed on the sheet instead.

#### TOR-720 / TOR-721 — In-game Storyteller panels the dashboard replaced are gone

**Context:** The Storyteller Dashboard is now the only place for these controls. The in-game PCs panel, XP log popup, Memoriam set-up popup, Sound tab and Spotlight colour strip were removed. The Phases tab was cut down to Quick Transition and the join controls. Old unused scene buttons, admin lighting buttons and the Debug Scatter panel were removed too. A few debug-only tools moved into the Debug column rather than disappearing.

**How to verify:** Save & Play with the dashboard running.

1. Open the Storyteller toolbar. The tabs should be **Scenes, Phases, Stats, Projects** only (no PCs, no Sound). The console should show no errors on load.
2. Open **Phases**. It should show only the **Quick Transition** toggle and the join controls (Defer setXML, Arm Join XML, 1 Assets / 2 HUD / 3 Emitters, Refresh XML). There should be no Advance button, no Main / Downtime buttons and no session number or title boxes.
3. In Intermission, change the session number on the dashboard. The Intermission cover art and character-sheet page 6 should follow. Change the session title too.
4. Turn on **Quick Transition**, then advance to Play from the dashboard (click the next-phase button twice). The transition should run without the session song. Advance on to Spotlight: there should be **no** row of colour chips at the bottom of the screen, and the dashboard's rotate / bring-to-front controls should turn the carousel. Advance to End and back to Intermission as usual.
5. Open the Debug column. Under the Debug Camera button there should be a new row with **Silence for save** and **Inspect sound**. Inspect sound should print emitter details in the console. Silence for save should silence the emitters.
6. Still in the Debug column, switch connection mode to **Assume Connected**. A row of five seat buttons should appear. Clicking one should turn it red or green and disconnect or connect that seat as a simulation.
7. On the dashboard, change music mood, a lane volume, and play then stop a featured track. TTS should follow each change and the dashboard's sound display should update. Also apply a scene and a clock change from the dashboard and check the sound display refreshes.
8. On the dashboard's PCs tab, change a player's damage and add an XP log entry. The character sheet should follow. Open the dashboard's Memoriam popup once to confirm it still enters Memoriam.
9. Apply a scene from the dashboard. The table lighting should match that scene's lighting preset. End the scene and the lighting should return to the default. The Debug column should have no Debug Scatter button.

### High — the dashboard's Scenes tab: scene controls

#### TOR-679 / TOR-680 / TOR-691 — The Scenes tab follows TTS and drives it

**Context:** TOR-679 is the plumbing (TTS pushes phase, scene, clock, sound and seat changes); if the Scenes tab follows TTS changes without a page refresh, it works. TOR-680 lets the tab send commands back. TOR-691 limits the real-time clock to Play's Main subphase and Memoriam.

**How to verify:** Sit at the Storyteller seat with a live scene and open the **Scenes** tab.

1. **Sound:** drag the Music slider: TTS's music volume should follow, and the slider should not jump back while you drag. Pick **Combat** in the music list, then **Casa Loma** (under Location): TTS should switch each time and the list should stay on your choice. Play a featured track with ▶ and stop it with ■. Change the ambient loop.
2. **Clock:** click the clock button at the top right of the date-and-time panel: real time should start in TTS at 2×. Right-click it and pick 5×, then click it again to stop. Drag the moon to another time tonight and press ▶: the TTS clock should animate there. The dusk and dawn times in the bottom corners should look right for the date.
3. **Real time only in Main and Memoriam:** end the scene so the game is in Downtime. The clock button should disappear and the clock should stop. In the in-game Scenes panel, the real-time toggle should say real time only runs during Main and Memoriam.
4. **Seats:** right-click a seated PC on the dashboard and choose **Out of the scene**: the seat should go dark in TTS. Right-click again and choose **Into the scene**.
5. **Phase:** during Intermission, change the session number or title in the phase bar and press Enter: TTS's session number and title should match. Use **Advance ▸** to move to Play. In the Spotlight phase, click › and then a headshot: the TTS spotlight carousel should turn each time.
6. **Pushes:** while doing the above, change something from TTS itself (move the clock or switch the subphase on the in-game panels): the dashboard should follow within about a second.
7. **In TTS itself:** click a seat's presence toggle and the real-time toggle in the in-game Scenes panel once each. Both should work as before.

#### TOR-683 — Location, fog, sky, lighting, table, conditions, weather, Memoriam and thunder from the dashboard

**How to verify:** In a live scene with at least one NPC on the stage:

1. **Stage positions:** each NPC token on the stage drawing should sit right on a small snap circle, in the same pack as in TTS.
2. **Thunder:** turn on a thunderstorm. Drag the dashboard's thunder slider low: the next clap should be quieter, and the in-game Thunder slider (Sound panel, under Wind) should show the same level.
3. **Location:** click the location card and pick another District and Site: TTS should move the scene there (site card, sky, ambience). On a scene that is not linked to its library row, **Release override** appears in the card's corner; pressing it should put the library's location back.
4. **Top fog:** the **≋ Fog** button on the location card should roll the fog in and clear it again.
5. **Sky, lighting and table:** with the three drop-downs above the stage, switch Generic sky and Site sky, the Dark / Standard / Bright lighting, and the table: TTS should follow each. Right-click empty stage and choose **Placement** to switch to Scatter and back.
6. **Conditions:** add a condition with **+ condition**: it should appear on the in-game scene. Remove it with its ×. District and Site conditions show greyed and cannot be removed.
7. **Weather until dawn:** click the weather panel's rain or wind icon and pick something off-schedule: TTS should switch, and **Release override** should appear. Move the clock past the next dawn: the schedule should come back by itself. Pick a weather again and release it instead: the schedule should come back at once.
8. **Memoriam:** open the **Advance ▸** ring, choose **Memoriam…**, pick a character, year, panel (or Just Smoke) and who is present, and press **Advance**. TTS should enter the Memoriam as the in-game modal does. Then choose **Main ▸** from the ring: TTS should restore the interrupted scene.

#### ✅ TOR-682 — A scene less than fifteen minutes behind present day runs on present day

**How to verify:** Note the present-day time on the game-state overlay. Set a live scene's clock to ten minutes before present day: it should jump straight to present day. Set it to an hour before: it should stay an hour behind. With real time on and the scene catching up at ×5, it should land exactly on present day and then follow it, never stopping a few minutes short.

#### TOR-690 — Sound volume changes stick to the track, in every scene

**How to verify:** Start a scene whose music you know and drag the **Music** slider to about a quarter. Play a scene with different music, then go back: the first music should come back at your quarter level. The Location slider should behave the same way for an ambience. Thunder is unchanged: its slider still scales every clap.

#### TOR-702 — End → Intermission keeps the TR Loop playing

**How to verify:** Go from **End** to **Intermission**. The TR Loop should fade in after the blackout and keep playing for at least a minute without Main cutting in. Then advance to Play: the session intro should play and Main should come back afterwards.

### High — scene library and switching scenes

#### TOR-684 — The dashboard keeps the scene library and sends scenes to TTS when you play them

**Context:** The dashboard holds the master copy of the scene library (in its own file, not in the public repo). Playing a scene sends it to TTS first. A linked scene on the table is written back to the dashboard as you change it.

**How to verify:**

1. **Library:** during Play, press **Scene ▸** on the phase bar to open the Play a Scene window. Every in-game library scene should be listed with its District and Site, and the search box should narrow the list.
2. **Prepare a new scene:** press **+ Prepare a new scene…** and pick a location. A blue Preview opens named after the District and Site. Change its weather, sky or conditions: nothing should change in TTS. Press **Play Scene** and pick a time (TOR-697 below): TTS should play it with those settings, and it should appear in the in-game library too.
3. **Edit and Discard:** press **Edit** on a scene, change something, and press **Discard** twice. The scene should be unchanged when you open it again.
4. **Deck:** **On deck** in a preview adds the scene to the phase bar without switching to it. Right-click a deck scene: its preview should open straight away.
5. **Unlink and Fork:** click the table's scene title on the phase bar and choose **Unlink from the library**: an **unlinked** tag should appear, and the in-game row should show unlinked. Choose **Fork…**, name both scenes and press **Fork**: the phase bar should show the new name, and the in-game library should list both.
6. **Delete:** press **Delete** twice on a scene that is not on the table. It should leave both the dashboard list and the in-game library.

#### TOR-697 — The scene timing menu: Scene Time + and Now + rows, ×2 or ×5 to Now

**How to verify:** Click a gold (new) scene on deck in the phase bar, or **Play** on a new scene in the Play a Scene window. Ongoing scenes (green) no longer open this menu; see TOR-705 below.

1. The menu shows the scene's time and date on top (only when the scene was given a time of its own), Now below, a row of coloured buttons under each, and a Real time row with ×2 and ×5 to Now.
2. Hover the top row from left to right: the scene time should move on by 0, 15, 30 and 45 minutes, then 1 h, 1 h 30, 2, 3 and 4 hours. The Now block always shows present day, with a small "moves to …" tag if the preview passes it.
3. With a scene earlier tonight than Now, ×5 to Now should be lit. Click the leftmost top button: the scene plays at its own time and the clock runs fast until it reaches Now, then at ×2.
4. Switch again and click the third button on the Now row (+30 min): the scene should start 30 minutes after Now, Now should move on by 30 minutes, and the clock should run at ×2.

#### TOR-693 — Scene edits stay when you switch to another scene and back

**How to verify:** Play scene A. Move two or three NPCs on the stage and **Send**, change the music, and change the sky or lighting. Play scene B, then play A again: the NPCs, music and sky or lighting should be as you left them. Then move an NPC, press **End Scene**, and play A again: that move should still be there. Opening A's preview (**Edit**) while it is on the table should also show your latest changes. The weather override is not part of this: it covers the whole table until dawn.

#### TOR-704 — Library scenes no longer pick up seat changes from the table after they stop playing

**Context:** "Grand Audience" refused to play with `NPC1.tableSlot: 3 is already used by Brown`. Copying a scene between the library and the table only copied the outer list of seats, so later changes on the table (a player reconnecting, a Table B chair shuffle) quietly rewrote the stored scene until the next reload. Copies are now independent. Grand Audience was repaired on 2026-10-10 in both TTS and the dashboard: Mylène moved from chair 3 to chair 6 (Table A).

**How to verify:** Play Grand Audience: it should load with Mylène on chair 6 and no error. Then play a library scene on Table B, and End it or play a different scene. Change the table's seating (the Debug panel's simulated disconnect and connect for one PC, or switch tables so Table B reshuffles). Preview the first scene in the dashboard: its seats should be exactly as they were when it left the table. Play it again: no "already used by" message.

#### TOR-705 — Scenes are new, ongoing, ended or templates, and the scene controls are simpler

**Context:** Every library scene now has a status. Playing a scene makes it **ongoing**, and it stays ongoing when you switch away; only **End Scene** makes it **ended**. Templates are reusable set-ups (Elysium, the council chamber) that always play as a fresh dated copy. The Advance ring is gone. Restart the dashboard and Save & Play first.

**How to verify:**

1. **Phase bar:** during Play the right-hand button reads **Spotlight ▸** (click twice to advance), and a **Scene ▸** button beside it opens the Play a Scene window. Its header has **Memoriam…** and **End Scene**.
2. **Ongoing scenes:** play scene A at any time, then play scene B. A should stay on the phase bar in bright green. Click A: it should switch straight back with no clock menu, at A's own time, with the clock running fast (×5) until it catches up to Now. In the Play a Scene window, A should be at the top with a green star.
3. **New scenes and the deck:** in the Play a Scene window, click the empty star beside a new scene: it turns gold and the scene appears in gold on the phase bar. Clicking it there opens the clock menu as before. Click the star again to take it off.
4. **End Scene:** right-click green A on the phase bar and choose **End Scene** (twice): A leaves the phase bar and the main list. Press **Archive (1)** at the bottom of the window: A is there with a status picker and no Play button. Change it to **Ongoing**: A comes back to the phase bar. In TTS, the in-game Scenes panel should not list ended scenes.
5. **End Scene from the window:** with B on the table, open the window and press **End Scene** (twice): TTS goes to Downtime and B moves to the archive.
6. **Templates:** open a scene's preview (**Edit**), change its picker from **New scene** to **Template** and **Save**. It shows in [square brackets] everywhere, and disappears from the in-game Scenes panel. Press **Play** on it and pick a time: TTS should play a new scene called, for example, "Elysium (Oct 12)" (the night's date), and the template itself stays unchanged in the list.
7. **Memoriam:** with a scene on the table, open the window and start a **Memoriam…**. The phase bar's button should read **Return ▸**; click it twice and TTS should go back to that scene. Start a Memoriam from Downtime instead (End Scene first): the button should read **Downtime ▸** and leave you in Downtime with no scene.

#### TOR-718 — The in-game scene library only plays scenes; the dashboard is the only place to edit them

**Context:** Saved scenes are now created, edited, forked and deleted only on the dashboard, so TTS can no longer drift from the dashboard's copy. The in-game Import Scene window, the New Scene (fork) window and the Delete button are gone. The in-game Scenes panel still plays saved scenes and still changes the scene on the table. The Scenes panel's layout changed, so run the full build before Save & Play.

**How to verify:**

1. **Buttons:** open the in-game **Scenes** panel. The library column should show the scene list, the Apply buttons (Scene Time, ×5 to Now, SET Now, NOW and the NOW + rows), **Unlink** and **End Scene**, and no Import, New Scene or Delete buttons.
2. **Preview is read-only:** click a library scene that is not on the table, so it turns blue. Its table, seats, location and time show on the left. Try a table button, a seat, **Browse districts…** and the day or time boxes: nothing should change, and either the control is greyed out or a message says the scene is not on the table yet and to edit it on the Storyteller Dashboard or Apply it first.
3. **Playing still works:** with that blue scene selected, press **Scene Time** (or **NOW**). The scene should play under the blindfold exactly as before.
4. **The live scene is still editable:** with the scene on the table selected (green), change a seat's presence, the location (Browse, pick, then Apply location) and the clock. The table should change as before, and the dashboard should show the same changes.
5. **Dashboard play:** play a scene from the dashboard's Play a Scene window. It should play normally. If the dashboard ever shows a message starting `upsertScene:`, TTS refused a scene it could not play (a broken time, lighting preset or chair numbers) and nothing changed on the table.
6. **Test scenes stay out of the dashboard:** run the Scenes playbook (Scenes-E2E). Afterwards, the dashboard's Play a Scene window should not list any scene starting with "E2E".

### High — the dashboard's Scenes tab: stage, seats and NPCs

#### TOR-685 / TOR-687 — Arranging the stage from the dashboard; the Stage Control board only holds spotlight tokens

**Context:** The dashboard's stage drawing is now the only place to arrange NPCs. Stage edits wait in a small queue at the bottom left until you press **Send**, then arrive in TTS together. The in-game Stage Control board lost its Apply / Load / Clear buttons, THERE preview, palette, PC tokens and generic import box; each NPC on the stage gets one large token there, placed by script, for the "Spotlight NPC (hold)" hotkey.

**Before you test (TOR-687):** if not done already, delete the token palette board and everything on it, any PC tokens, the old NPC control tokens and any minimap markers left on the Stage Control board, then Save & Play.

**How to verify:** In a live scene with NPCs on the stage:

1. **Move:** drag an NPC token and press **Send**: the figurine should glide there. Dropping right on a slot circle snaps onto it; dropping on someone else's slot swaps the two.
2. **Light:** double-click a token: its halo and the figurine's light go out. Double-click again to light it.
3. **Off the stage:** drag a token off the drawing: the NPC leaves the stage in TTS.
4. **Group spread:** drag a whole group from the roster onto a pack. The leader takes the pack's middle slot and the rest spread beside them; anyone already there steps over, unlit, to the nearest free spots.
5. **Pack move:** grab the empty space around a pack's slot circles (a dashed outline shows) and drop it on another pack: everyone moves across together.
6. **Queue:** move three or four tokens and press **Send**: all figurines should glide at once. Queue a couple more and press **Clear**: the tokens go back and the queue closes.
7. **Clear and Reset:** right-click empty stage. **Clear Stage** (twice) takes everyone off and removes generic NPCs. **Reset to Library** restores the library row's stage.
8. **Scatter:** switch Placement to Scatter. Drag a PC or NPC between group circles: they should move in TTS. Drag an NPC out of every circle: they leave the stage. Switch back afterwards.
9. **Spotlight tokens:** each stage NPC should have exactly one large token on the Stage Control board (face down if unlit) that follows their dashboard moves and disappears when they leave the stage. Hover one and hold the "Spotlight NPC (hold)" key: that figurine should be spotlit until you let go. Tell me if the tokens are the wrong size.
10. **Werewolves:** right-click a Werewolf NPC on the stage: the roll ring should offer the Werewolf roll.
11. **Fallbacks:** with **In-game ST Rolls** (debug row of the Storyteller HUD) off, the in-game Storyteller roll dashboard and roll panel stay hidden even during an NPC roll; turn it on and they work as before. In the in-game Scenes panel, applying a scene and closing the panel should still work, with no THERE button.

#### TOR-703 / TOR-668 — Drag characters between seats and the stage

**Context:** The seat row is drag and drop on the live table, except while Scatter is on. Scene previews now allow it too, except on the Table B family (which shuffles every chair when the scene plays). Whenever an NPC leaves the stage, their seat lights up again. Seat drags are refused while dice are on the table. TOR-668 (NPC changes skip the full seat layout when no seat changed) was confirmed by trace; its remaining eye checks, seating an NPC and moving a seated NPC to the stage, are steps 3–5 below now that the Gameboard Apply is gone.

**How to verify:** Load a scene with at least one NPC seated and one empty chair.

1. Drag a PC's seat onto another PC's seat: they swap chairs in TTS (figurine, sheet, hand and lights move together) and on the dashboard.
2. Drag a PC onto an empty chair: they move there and their old chair empties.
3. Drag an NPC from the roster onto an empty chair: they sit there, lit.
4. Drag a seated NPC onto the stage: their seat goes dark at once, and after **Send** they stand on the stage in TTS.
5. Drag that NPC's stage token back onto a chair: they sit down there, lit, and leave the stage.
6. Put a seated NPC on the stage, darken them with a double-click, **Send**, then take them off the stage: their seat should light up again.

#### TOR-692 — Add generic NPCs in a batch and rename them from their stage token

**How to verify:**

1. In the roster, press **Generic**, open a group and click two or three figurines. Each leaves the roster and appears on the stage near the top-left corner, queued. Nothing spawns in TTS yet.
2. Right-click one of those tokens, choose **Rename…**, type a name and press **Rename**: the token and queue line show the new name.
3. Press **Send**: the figurines spawn in TTS at their spots, and the renamed one carries its name (hover it).
4. Rename a spawned generic and **Send**: its name in TTS and its Stage Control token should both change.
5. Click a generic again, then press the × on its queue line: it leaves the stage drawing and returns to the roster.
6. In a scene preview, click a generic: it appears on the preview's stage only, and spawns in TTS when you **Play Scene**.

#### TOR-699 — New default figurine heights on the inner stage rings

**How to verify:** Drag an NPC onto the Center spot and **Send**: the figurine should stand lower than before (-60). Do the same on Mid Center (a little higher, -57). Move an NPC who was already on the stage onto one of those spots: it takes the new height too.

#### TOR-723 — NPC data has one home: generic NPC list, roster groups and figurine sizes

**Context:** NPC data was kept in several hand-copied places. Now each piece has one owner. The generic NPC list in TTS comes from the same art table the dashboard uses. Each NPC's figurine size comes from the **Card scale** in the dashboard's NPC token settings, and NPCs without a setting use 53. Roster groups and each group's default leader now live in one dashboard file. Leftovers from the old Stage Control palette are gone (token sizes, yaw settings and the scatter drawing data), and so is the unused NPC Scale column in the Memoriam catalog. Old saves that still hold stage NPCs in the retired per-area format no longer convert them: the Host console prints which NPCs were dropped so you can place them again. Nothing should look different on the table.

**How to verify:**

1. Restart the dashboard server once, then reload the dashboard tab. Open the roster: the same categories, groups and group leaders as before should be there, with nobody missing.
2. Save & Play. The game should load with no red errors in the Host console. If the console prints "dropped legacy npcWorld.byArea stage rows", place the NPCs it lists on the stage again and tell me which save it came from.
3. Put three or four named NPCs you know well on the stage and **Send**. Their figurines should be the same size as before, and they should face the same way as before. Include one whose card scale you changed in the NPC token settings, if you have one.
4. In the roster, press **Generic**, add one generic NPC and **Send**: it should spawn with its usual name and art.
5. Start a Memoriam scene that has NPCs: they should spawn with their usual art and size.

### High — dice and rolls

#### TOR-686 — Run every Storyteller roll from the dashboard

**Context:** The Rolls column does what the in-game Storyteller roll dashboard did. A card's frame shows its state: a red glow is waiting for your approval, steady gold is ready, pulsing gold is rolling (blue during a Willpower reroll), dark red is rolled. A Storyteller result the table has not seen yet has a dashed, pulsing orange frame; a finished, broadcast roll has no frame.

**How to verify:**

1. Right-click a PC's seat and pick **Standard**: a card with a red glow appears, and TTS waits for you.
2. Click a difficulty number: the frame turns gold and the player's roll opens in TTS.
3. Click the gear: the options pop-up matches the TTS options window. Change one and press **Apply**: TTS should show it.
4. Have the player roll: the card pulses while the dice tumble, then turns dark red with coffin-face dice and the result. Click the diamonds and use the small dice ring (left-click the white die to add, right-click to remove): the pool in TTS follows. Try **Override…**.
5. Start an NPC roll and build its pool by clicking the dice ring several times quickly: every click should count at once, and TTS should end with the same pool.
6. Have a player spend Willpower on a rolled roll: the card turns blue and pulses during the reroll.
7. **Hunt:** in the hunt panel under the location card, click a resonance flavor and pick the hunting PC, press the circling arrows to roll, then press the loudspeaker. TTS should show the resonance on the result banner, and the hunt bar should reset.

#### TOR-688 / TOR-698 — Storyteller dice spawn on the drawer tray, and the drawers are visible

**Context:** The Storyteller no longer has dice bags; dice are created on the drawer tray. The 72 spare Storyteller dice are removed on first load. Drawers used to rise invisibly, and a seated NPC's dice spawned under the tray. You can delete any leftover Storyteller dice bags from the save.

**How to verify:**

1. Loading shows no console errors. (Optional: `print(#getObjectsWithTag("d10Preload"))` in Execute Code prints 192, not 264.)
2. Right-click a stage NPC, pick **Standard**, add normal and hunger dice, set a difficulty and press the dice icon. The drawer rises into view, the tray light comes on, and the dice appear on the tray and tumble. The result matches the dice.
3. Pick one or two dice and press **Reroll**: they toss properly, not just wiggle.
4. Repeat with a Rouse roll, and a Werewolf roll on a Werewolf NPC: each dice kind looks right.
5. Seat an NPC and roll for them (right-click their seat): the drawer rises in front of that seat, the dice sit on its red tray (not the table), and Roll and Reroll both tumble them.
6. Cancel or confirm: the dice disappear and the drawer sinks out of sight.

#### TOR-700 — Storyteller reroll picks stay on the dashboard until Reroll

**How to verify:** After a Storyteller roll settles, click two dice: they highlight at once, with no "Sending to TTS" line and no change on the in-game roll panel. Click one again to unpick it. Press **Reroll**: only the picked dice toss, and afterwards nothing is picked.

#### TOR-689 / TOR-694 — Finished rolls stay on the dashboard as cards

**How to verify:**

1. Have a player make an ordinary roll and confirm it. Their card stays with the result (for example "WIN +2"), difficulty and dice, and has no frame once broadcast. A Rouse check shows only its diamonds and outcome.
2. Confirm an NPC roll: the drawer becomes a full card with the NPC's name, a "Drawer N" tag, pool, difficulty, result and dice. It stays after the broadcast.
3. Click a card's name: it folds to one line with the result; click again to unfold. A folded card should stay folded when you switch tabs or reload the dashboard.
4. The broadcast icon shows the result banner in TTS again.
5. Roll another NPC and right-click Confirm to hold the result: the card shows a "Held" tag and a dashed pulsing frame, and its broadcast icon reads "Broadcast to the table". Broadcast it: the banner shows in TTS and the frame disappears.
6. Hover a card and click its X: the card goes away, and for a Storyteller card that drawer clears in TTS.

#### TOR-701 / TOR-695 — Switching scenes clears finished rolls, and explains a refusal

**Context:** Switching scenes or tables used to refuse whenever dice were on the table. Now finished, broadcast rolls are cleared and the switch goes ahead. It still refuses while a roll is in progress, while a Storyteller drawer holds a result back, or for loose dice that belong to no roll, and the dashboard shows why in a red **Not done in TTS** banner over the stage.

**How to verify:**

1. Roll a Storyteller roll and Confirm normally. While its card is showing, play another scene: the switch goes ahead and the drawer sinks away.
2. Start a Storyteller roll and leave it unconfirmed. Play another scene: it refuses, and the red **Not done in TTS** banner explains why. Click **OK** to close it.
3. Roll and right-click Confirm (hold). Play another scene: it still refuses. Broadcast the held result and try again: it goes ahead and clears the drawer.
4. Have a player finish a roll and, while their result banner is up, play another scene: it goes ahead and their dice disappear.

#### ✅ TOR-674 — Rouse checks open without waiting, and the result is as short as a quick Rouse

**How to verify:** At a player seat with no roll in progress, left-click the Rouse bag. The roll panel appears straight away with **Roll** usable (no "Awaiting Storyteller"). Roll it: the result stays fully visible for about a second, then fades, like a right-click quick Rouse. Do the same with the Oblivion Rouse bag. A normal roll (left-click the Normal bag) should still wait for the Storyteller, and its result should still last about six seconds.

#### TOR-696 — A lit signal fire shows on the dashboard, and the dashboard can put it out

**Context:** Your later pin made this gentler: no banner, edge glow or chime any more. The player's seat glows and a flame floats above it.

**How to verify:** In TTS, click a player's signal candle to light their fire. Within a second their seat on the dashboard's Scenes tab should glow with a flame above it. Click the flame: the fire in TTS goes out and the glow disappears. Light it again, then put it out from TTS by clicking the candle: the dashboard glow should clear too.

### Medium — Prince's Court sheet

#### ✅ TOR-663 — Refresh XML keeps The Court on the people who had it open

**How to verify:** Open The Court on its second spread so your Haven Merits show. On the Storyteller Phases panel, press **Refresh XML**. The Court should stay open on the same spread with the same merits, dots and text, and only the people who had it open should see it. Then close The Court and press Refresh XML again: it stays closed for everyone, and opening it afterwards still shows the current merits.

### Medium — soundscape

#### ✅ TOR-706 — The build puts every sound emitter on silence in the save, so loading doesn't burst a track

**Context:** When TTS saves, each sound emitter remembers the track it was playing, and on load it starts that track at full volume before the mod can mute it. The Main, XML and Full builds now switch every emitter back to the silent track in the save file. This only helps when you load the save from the main menu (File → Load). Save & Play replays the save TTS last loaded or saved itself, not the patched file on disk.

**How to verify:**

1. In TTS, play a scene with featured music (or any music) so an emitter is mid-track, then save over save 230.
2. In Cursor, run **BUILD PIPELINE (Main)**. The terminal should show a `[tts-save:silence-emitters] Set SOUNDSCAPE_…` line for each emitter that was playing, then a backup path and `Wrote … TS_Save_230.json`.
3. Go back to the TTS main menu and load save 230. There should be no blast of music while the table loads. The soundscape should start the normal way, fading in once the mod takes over.
4. Run the build a second time: it should say `All 10 emitters already on silent.`

### Medium — locations

#### TOR-719 — Site fog follows the sheet; four sites get their location sound back; Yonge & Bloor spelling

**Context:** Every site carried the "Top Fog" value from your Districts & Sites workbook, but the game never read it, so every indoor site had fog off and every outdoor site had fog on. 37 sites are authored differently in the sheet and now follow it. Separately, eight sites asked for location sounds that do not exist under those names, so their location layer stayed silent.

**How to verify:**

1. Save & Play. From the dashboard (or the in-game location picker), go to **Sewer Tunnel**, an indoor site whose sheet value is fog on: the top fog should come on. Then go to **Taxi**, an outdoor site set to fog off: the top fog should stay off. A normal outdoor site such as **Back Alley** should still have fog, and a normal indoor one such as **Anarch Dive Bar** should not.
2. Go to **Auto Mechanic**, then **Bier Markt**, then **The St. Regis Toronto: Room 101**, then **The Nosferatu Warrens: Palis'**. Each should play a location sound (auto shop, dive bar, computer lab, and the Warrens ambience). The Host console should not print "Unknown location audio".
3. Open the district picker: the museum district should read **The Yonge & Bloor Museum District**.

#### TOR-722 — Sites, districts and the weather schedule now come straight from your sheets

**Context:** The game's list of districts and sites, and the hour-by-hour weather schedule, used to be hand-kept copies in the code. They are now generated from your Districts & Sites workbook and the WEATHER tab of the Toronto Rising sheet (`npm run locations:import`, `npm run weather:import`). Almost everything is identical. The visible differences come from your sheet: **Dupont by the Castle** is now spelled with lower-case "by the"; **Deer Park** now carries the **bestialNull** condition and **Riverdale** the **noHungerDice** condition (both are in the sheet's Condition column but were never in the game before); and five Warrens rooms (Antechamber, Drake's, Labyrinth, Spawning Pool, Tunnel Junction) asked for a "nosWarrens" music playlist that does not exist, so they now fall back to the default mood music instead of silently keeping whatever was playing before.

**How to verify:**

1. Save & Play. The game should load with no red errors in the Host console.
2. From the dashboard (or the in-game location picker), go to three or four sites you know well, for example **Anarch Dive Bar**, **Back Alley** and **Casa Loma: Great Hall**. Each should show its usual sky, location sound, fog and site card (on the location overlay and behind the blindfold), and its map pin should sit where it always has.
3. Open the district picker: the Casa Loma district should read **Dupont by the Castle**.
4. Go to **Deer Park** and then **Riverdale**. Their conditions (Deer Park: **Bestial Null**; Riverdale: **No Hunger Dice**) should now show as active location conditions. Tell me if either of those is a sheet entry you did not mean to turn on.
5. Go to **The Nosferatu Warrens: Labyrinth**. The background music should switch to the default mood music. If you want a dedicated Warrens playlist instead, that needs adding to the soundscape catalog.
6. Advance or set the in-game time across a few hours: the weather should change exactly as it did before (the schedule data itself did not change).

## Cleared

_Remove confirmed entries from Outstanding. In Linear, set **Fully Complete** by default; use **Complete (KEEP)** sparingly when the issue contains lasting information that should remain._
