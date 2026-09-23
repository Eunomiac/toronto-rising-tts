# Chesterton’s fences — oddities worth asking upstream

> “If you come across a fence in the middle of nowhere, find out why it was built before you tear it down.”
> (Chesterton’s fence — mangled, but the right instinct.)

This note lists **strange-looking decisions** in the current TTS Editor code (`tts-tools/packages/tts-editor`) where we should not casually “fix” them without understanding intent — especially given TTS flakiness. Prefer asking Sebastian Stern / checking Atom-plugin norms before ripping them out.

Related plan: [Changes to TTS Tools Extension.md](./Changes%20to%20TTS%20Tools%20Extension.md).

---

## Fence 1 — Ignore `scriptStates` Lua/XML for objects; `getJSON` per GUID instead

**What you noticed:** After Save & Play / load, TTS already sends `scriptStates` with `script` / `ui` per object. Global uses that. Every other object calls `getObjectFromGUID(…).getJSON()` and rebuilds files from that (via `unbundleObject`). That is the multi-minute path.

**What history suggests (not gossip — git):**

1. Early on, the extension **did** write Lua/XML from `scriptStates` for all objects.
2. Commit `a670d79` (*“Get data file together with objects”*, 2024-01-05) added `getJSON` so each object could get a **data JSON** file (for the object tree / later Update Object). Scripts still came from `scriptStates` at that point; `getJSON` results even cleared `LuaScript`/`XmlUI` before storing data.
3. Soon after (`5a08a8f`, *“Improvements”* / Update Object work), `readObject` started treating **full `getJSON`** as the source of truth for scripts **and** data, and the per-object `scriptStates` payload stopped being used for non-Global writes.

**Plausible reasons to keep the fence (hypotheses to verify):**

| Hypothesis | Why it might be true |
| --- | --- |
| **A. Need full object JSON, not just scripts** | Update Object / `bundleObject` / `data.json` need save-file-shaped JSON (`ContainedObjects`, states, etc.). External Editor `scriptStates` only carries name/guid/script/ui — [official API](https://api.tabletopsimulator.com/externaleditorapi/#loading-a-new-game). |
| **B. Nested scripts inside containers** | Bag/deck contents can have scripts that never appear as top-level `scriptStates` entries. `getJSON` + `unbundleObject` can surface nested Lua/XML; `scriptStates` cannot. |
| **C. Consistency / one unbundle pipeline** | One path through `savefile` unbundle avoids “scriptStates say X, getJSON says Y” drift after TTS reload. |
| **D. TTS `scriptStates` flakiness** | Possible but **not documented** in commits; we should ask rather than assume. Early code trusted `scriptStates` for scripts. |

**Implication for our plan:** Preferring `scriptStates` for **top-level** `.lua`/`.xml` speed is still reasonable, but we should **keep `getJSON` (or equivalent) when we need `data.json` / nested content / Full Resync** — not assume the message alone replaces the fence entirely.

**Ask upstream:**

> When you moved object script import to `getJSON` instead of `scriptStates`, was that mainly to support `data.json` / Update Object / nested container scripts? Did you ever see `scriptStates` script/ui disagree with `obj.getJSON()` after Save & Play?

---

## Fence 2 — Wipe all of `.tts` on every `loadingANewGame`

**What:** `clearOutputPath()` deletes `objects/`, `bundled/`, and `output/` before re-import.

**Plausible reasons:**

- Stale GUID folders after objects deleted in TTS
- Filename changes when Nickname changes (`Name.guid` pattern)
- Avoid mixing pre-2.1.0 flat `.tts` layout with `objects/` subfolder (changelog warned users to clean manually once)

**Ask:** Was a full wipe intentional vs incremental delete-by-GUID? Any TTS cases where leaving old files caused wrong Save & Play?

---

## Fence 3 — Save & Play always triggers a full game reload echo

**What:** Feels like the extension “re-imports for no reason.”

**Official API:** Save & Play on TTS **reloads the save**, then sends the same message ID 1 as loading a new game. The extension’s `onLoadGame` is reacting to **protocol**, not inventing a second import for fun. Upstream docs (`usage.adoc`) even warn: Save & Play reverts unsaved table changes.

**Ask:** Mostly confirmation — any editor-side way to Save & Play *without* reload, or is that TTS-only?

---

## Fence 4 — Two Save & Play commands (live bundle vs send `.tts/bundled`)

**What:** “Save and Play” re-bundles from sources; “Save and Play (Bundled)” sends on-disk bundled files as-is.

**Documented reason (`bundling.adoc`):** Exploring *other people’s* mods — you have bundled scripts in TTS but not the require/Include tree. Bundled Save & Play lets you round-trip without local sources.

**Fence status:** Explained. Keep both unless UX consolidation is intentional.

---

## Fence 5 — Go to Error reads `.tts/bundled`, not what was last *sent*

**What:** Error mapping walks `__bundle_register` in the on-disk bundled file. Live Save & Play may not rewrite that folder.

**Plausible reason:** Bundled file is the only durable artifact that matches TTS line numbers after a load/Get Objects; sending an in-memory bundle without write-back was an oversight or “Get Objects will refresh it.”

**Ask:** Was skipping write-back of the just-sent bundle intentional?

---

## Fence 6 — `deactivate()` never closes the 39998 listener

**What:** `@matanlurey/tts-editor` has `close()`, but extension deactivate only logs.

**Plausible reasons:** VS Code deactivate timing; fear of breaking in-flight TTS; oversight.

**Ask:** Intentional, or safe for us to close on deactivate?

---

## Fence 7 — Empty `objectCreated` handler

**What:** Subscribes to TTS “object created” and only debug-logs.

**Plausible:** Placeholder for auto-pull script / future feature; Atom may ignore it too.

**Ask:** Planned use, or dead wire we can ignore?

---

## Fence 8 — Sequential `await getJSON` in a `for` loop (not parallel)

**What:** One executeLua round-trip per object, strictly serial.

**Plausible reasons:** TTS scripting engine / External Editor executeLua not safe under concurrent requests; returnID demux in the API client; rate limiting.

**Ask:** Did parallel fetches ever corrupt returns or hang TTS?

---

## Fence 9 — `]]` escaping when spawning JSON via Lua long strings (`updateObject`)

**What:** `newData.replace(/\]\]/g, ']] .. "]]" .. [[')` before embedding JSON in `[[...]]`.

**Plausible:** Required Lua long-string escaping — classic fence, probably **keep**.

**Ask:** Only if we change spawn method (e.g. base64 / temp file).

---

## Fence 10 — Command namespace still `ttsEditor.*` while product is “TTS Tools”

**What:** `extensionName = "ttsEditor"`; commands like `ttsEditor.saveAndPlay`.

**Plausible:** Stable command IDs for keybindings / other extensions (`executeCode` was documented as usable from other extensions in 1.1.0). Renaming breaks users.

**Ask:** Any dependents on `ttsEditor.*` IDs we should preserve when rebranding?

---

## Fence 11 — savefile / xmlbundle quirks (bundled libs)

Worth a shorter ask if talking savefile too:

- Line-ending / whitespace “quick fixes” before luabundle unbundle (copy-paste from TTS).
- xmlbundle 2.x returning `{ root, bundles }` vs string (breaking change already in tree).

## How we should use this list

| Fence | Safe to change without asking? | Our plan stance |
| --- | --- | --- |
| 1 getJSON vs scriptStates | **No** — ask; change carefully | Use scriptStates for top-level script/UI speed; keep getJSON for data/nested/Full Resync |
| 2 full wipe | Ask preferred; incremental is likely OK | Replace wipe with reconcile |
| 3 reload after Save & Play | Can’t remove — TTS protocol | Skip *redundant* resync after *our* send |
| 4 two Save & Play modes | Yes if UX-only | Keep |
| 5 bundled write-back | Likely yes | Fix in fast Save & Play |
| 6 deactivate close | Ask; low risk | Do close / Claim-Release |
| 7 objectCreated | Yes to leave alone | Ignore until needed |
| 8 serial getJSON | Ask before parallelizing | Keep serial unless proven safe |
| 9 `]]` escape | Keep | Keep |
| 10 command ids | Keep for compatibility | Keep `ttsEditor.*` |

---

## Newly identified: object/script scramble on fetch (likely bug, not a fence)

**Symptom (author):** After fetching objects from TTS, scripts/GUIDs often appear swapped or mixed.

**Likely causes in current stack (high confidence):**

### A. `executeLuaCodeAndReturn` ignores `returnID` (dependency)

In `@matanlurey/tts-editor` (used by the extension):

```js
executeLuaCodeAndReturn(script, guid = '-1') {
  yield this.executeLuaCode(script, guid); // sends returnID: N
  return this.once('returnMessage').then((v) => v.returnValue); // accepts ANY return
}
```

Each object import calls `getJSON` via this path. The client **increments** `returnID` on send but **does not filter** the reply. Whichever `returnMessage` arrives next is treated as the answer for the current GUID. If two Lua executions overlap — or a late reply from a previous call arrives — **object B’s JSON is written into object A’s files**. That matches “scripts on the wrong objects / GUIDs mixed up.”

### B. Overlapping imports (no mutex)

`onLoadGame` starts a long `readFilesFromTTS` (N serial `getJSON`s). Nothing prevents a second `loadingANewGame` (another Save & Play, Get Objects, reload) or `onPushObject` from starting another `readFilesFromTTS` while the first is still running. Two in-flight `once('returnMessage')` waiters will steal each other’s replies → scramble.

`onPushObject` calls `readFilesFromTTS` without awaiting or coordinating with an in-progress load.

### C. Why it feels “frequent” on Toronto Rising

Huge object count ⇒ long import window ⇒ more chance of a second load event, Execute Code, Update Object, or a delayed TTS return overlapping the `once('returnMessage')` waiter.

**Fork fix direction (when we implement Epic A):**

1. Match returns by `returnID` (patch/wrap the API client — do not trust bare `once('returnMessage')`).
2. Single-flight lock around `readFilesFromTTS` / import (queue or cancel previous).
3. Prefer `scriptStates` for top-level Lua/XML to shrink how many `executeLua` calls happen during import.

Worth mentioning to Stern as “we think we found a returnID race,” separate from the intentional getJSON-vs-scriptStates design question.
