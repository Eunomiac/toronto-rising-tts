# Chesterton’s fences — oddities worth asking upstream

> “If you come across a fence in the middle of nowhere, find out why it was built before you tear it down.”
> (Chesterton’s fence — mangled, but the right instinct.)

This note lists **strange-looking decisions** in the current TTS Editor code (`tts-tools/packages/tts-editor`) where we should not casually “fix” them without understanding intent — especially given TTS flakiness. Prefer asking Sebastian Stern / checking Atom-plugin norms before ripping them out.

Related plan: [Changes to TTS Tools Extension.md](./Changes%20to%20TTS%20Tools%20Extension.md).

---

## Upstream reply — Sebastian Stern (received by 2026-09-29)

The author emailed Sebastian (`sebastian.stern.42@gmail.com`, from his own git commits / original `package.json`) on 2026-09-23 with five numbered questions. He replied warmly: happy for the fork, **open to integrating the changes upstream**, and notes TTS scripting is low priority for him now.

### Which question maps to which fence

| Email # | Question we asked | Fence below | His answer (short) |
| --- | --- | --- | --- |
| 1 | Why per-object `getJSON` instead of `scriptStates` for Lua/XML? | Fence 1 | Done for **Update Object** (bags with nested scripted objects). Once he had `getData()`, he used it as the single source. Admits it made scripts slow/late; he meant to move back to `scriptStates`. |
| 2 | Why wipe all of `.tts` on every load? | Fence 2 | Copied from the Atom / other VS Code extension. Some users keep **one folder for every mod**, so a "mod changed → clean everything" step is still needed for them. Incremental is fine otherwise; obsolete files are harmless because only loaded objects are sent. |
| 3 | Why doesn't Save & Play write the sent bundle back for Go to Error? | Fence 5 | Not intentional — fine to change. |
| 4 | Why doesn't deactivate close port 39998? | Fence 6 | Not intentional — assumed VS Code would close it. Closing on deactivate is sound. |
| 5 | Why strictly serial `getJSON`? | Fence 8 | Vague memory of trying parallel and hitting **scrambled return order**; never fixed in `@matanlurey/tts-editor`. Won't vouch for parallel. Suggests dropping blanket `getData()` — **load it only on demand at Update Object time**, or make it a setting. |

### What it means for the fork (as of extension 2.5.0)

- **Fences 1, 5, 6, 8:** Epic A/B already match his intent — `scriptStates` for Lua/XML, bundle write-back on Save & Play, `close()` on deactivate, `returnID` matching + single-flight import, still serial.
- **Fence 2 — partly covered:** `pruneMissing` only walks the **in-memory** loaded-object list (`plugin.getLoadedObjects()`), which starts empty on every Extension Host start and is never rebuilt from disk. So vanished GUIDs are pruned only if they were seen earlier in the **same session**; files from a previous session or a previously loaded mod stay on disk. Per his answer this is harmless for correctness — Save & Play sends only loaded objects (`ttsAdapter` iterates `getLoadedObjects()`), not whatever is on disk — but single-folder users (and agents grepping `.tts/`) can see orphan files. An upstream PR would need a disk-level "delete `*.guid.*` files whose GUID is not in this `scriptStates`" pass to fully replace the wipe.
- **Regression vs upstream (Update Object):** Upstream refreshed every `data.json` on every load. In incremental mode the fork fetches `getJSON` only when `data.json` is **missing**, then reuses the cached file indefinitely (across sessions). **Update Object** (`ttsAdapter.updateObject`) bundles from that cached `data.json` plus current `.lua`/`.xml`, so if a bag's contents, states, or other properties changed on the table since the first fetch, Update Object can respawn the object with the **old** contents. Workaround today: **Get Object** (single live `getJSON`) or **Save & Play (Full Resync)** before Update Object. Proper fix is his suggestion — fetch live `getJSON` right before Update Object — which also lets the first-load `getJSON` pass become lazy or a setting.
- **Fence 8 / parallel requests:** The extension's own import is still serial under `importMutex`. Concurrent Lua does now happen **across clients** (extension + Dashboard via the gateway), but every return is matched by `returnID` (`tts-gateway` `returnIds.ts`, `gateway-client` `directSession.ts`, extension `returnIdDemux.ts`) — the missing piece in `@matanlurey/tts-editor` that caused his scrambled-order memory. Relies on TTS echoing `returnID`, which the External Editor API documents and Epics C–E verification exercised.

### Follow-ups (not started)

1. **Update Object fetches live data:** call `getJSON` for that GUID immediately before `bundleObject`, instead of trusting cached `data.json`. Then consider making the initial per-object `data.json` fetch opt-in (setting) or lazy.
2. **Upstream contribution (author's call):** he is willing to merge. Options: one PR per epic (A: fast sync; B: port Claim/Release + deactivate close) against `Sebaestschjin/tts-tools`, or keep the fork separate and only publish the community fork. Gateway (Epics C–E) is likely too large for upstream without discussion.

### His reply (verbatim)

> Hi Ryan,
>
> Thanks for the heads up and nice to hear that you like the extension.
> I'm happy to integrate your proposed changes, they sound great. Some of them I also wanted to do at some point but just never got around to it. Since there's not much time for TTS scripting for me for a while now, the priority just is very low. ^^"
>
> 1) The main reason for this decision was the "Update Object" feature. In my use-case I have bags with nested objects that have scripts attached and I wanted to easily update them without taking them out or building a new save file. Thus I needed the whole information from getData() so that I could easily change that. So I thought, if I already have and use the getData() part, it doesn't make sense to use information from two different sources and only use the data one. However, this wasn't the best decision as loading the information can then be slow and make the scripts available too late. I wanted to change that back to use the scriptState itself, but didn't get around to do it.
>
> 2) This was more of a leftover from how the Atom extension and the other VS Code extension works. The intended usage for this extension is having a separate folder/workspace for each TTS project you use. The other extension only has a single folder for all files. So that when you change mods and don't delete old stuff, you might end up with unnecessary files. Not everyone seems to be familiar with how workspaces work and thus I used the same approach as the other extension. It would be useful to have an incremental approach and it should be fine. Obsolete files wouldn't be a problem, as the extension only sends stuff that it actually loaded. However a "clean everything because the mod changed" is still required for single workspace use. Not sure right now, what the best approach for this would be.
>
> 3) Wasn't intentional and should be fine to do. I guess I just never thought about that.
>
> 4) Also not intentional. I think I just assumed that deactivating the extension would auto-close the socket on its own.I'm actually not super knowledgeable with the VS Code lifecycle, but I'd consider closing the socket on deactivation sound reasonable and safe to do.
>
> 5) Hm... I don't fully recall if I ever tried to parallelize it. I have a vague memory that I did and then ran into the scrambled return message order and didn't get around fixing this issue in the tts-editor package.I can't vouch that parallel is safe especially since I don't trust TTS enough to not fuck it up. ^^ I think a better approach in general might be to get rid of the getData() part for all objects and make that either a setting or only do this on demand. Since the only practical use-case for this is the "Update Object" feature, it might be worthwhile to think about if only at that point the data could be loaded from TTS, then the whole thing is bundled and sent back to TTS. Or at least making it toggleable so it isn't used in mod where it isn't required.
>
> Greetings,

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
| 1 getJSON vs scriptStates | **Answered** — only for Update Object; he wanted scriptStates back | scriptStates for script/UI (done); follow-up: live `getJSON` at Update Object time |
| 2 full wipe | **Answered** — legacy; incremental OK if single-folder users still get cleaned | Reconcile + in-session prune (done); disk-level orphan prune still missing |
| 3 reload after Save & Play | Can’t remove — TTS protocol | Skip *redundant* resync after *our* send |
| 4 two Save & Play modes | Yes if UX-only | Keep |
| 5 bundled write-back | **Answered** — not intentional | Fixed in fast Save & Play |
| 6 deactivate close | **Answered** — not intentional; closing is sound | Close on deactivate + Claim/Release (done) |
| 7 objectCreated | Yes to leave alone | Ignore until needed |
| 8 serial getJSON | **Answered** — parallel likely scrambled returns; won't vouch | Keep serial; shrink `getJSON` use instead |
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
