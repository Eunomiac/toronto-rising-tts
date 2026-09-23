# Marketplace publish — steps for the author

Agents can prepare repo attribution; **you** must do identity, courtesy contact, and the actual Marketplace upload. This checklist is for the Eunomiac fork of TTS Tools (`eunomiac.tts-tools`).

Design notes live beside this file: [Changes to TTS Tools Extension.md](./Changes%20to%20TTS%20Tools%20Extension.md), [GATEWAY-INTEGRATION-DRAFT.md](./GATEWAY-INTEGRATION-DRAFT.md).

---

## Already done in the repo (for your awareness)

- Distinct publisher id in manifest: `eunomiac` / name `tts-tools`
- `displayName`: **TTS Tools (Community Fork)**
- `author` credits you + Sebastian Stern
- Marketplace-oriented `description` (unofficial; not Berserk Games)
- `LICENSE` (MIT + Stern copyright + fork modifications line)
- `NOTICE` (upstream credit, licenses, dependency pointers)
- Extension `README.md` fork banner + credits + upstream issue guidance
- Root `tts-tools` README credit blurb
- `CHANGELOG.md` Unreleased note about fork rebrand
- `bugs.url` → your GitHub issues

---

## Your steps

### 1. Courtesy message to the upstream author (do this before a public listing)

Contact Sebastian Stern / the [Sebaestschjin/tts-tools](https://github.com/Sebaestschjin/tts-tools) maintainers (GitHub issue or whatever contact they prefer). Tone: short, respectful, factual.

**Suggested text (edit freely):**

> Hi — I’ve been maintaining a personal fork of TTS Tools for a Tabletop Simulator chronicle workflow (https://github.com/Eunomiac/tts-tools). I’m considering publishing it on the VS Marketplace under my publisher id `eunomiac` as **TTS Tools (Community Fork)** (`eunomiac.tts-tools`), with clear attribution to you and Sebaestschjin/tts-tools, MIT notices retained, and no claim that it’s the official extension or affiliated with Berserk Games.
> Planned differences include faster Save & Play sync behavior and an optional local multi-client editor gateway. I’m collecting a few “why is it built this way?” questions (with context) so we don’t tear down intentional fences — full draft in the fork notes if useful as a separate issue.
> I wanted to give you a heads-up out of courtesy. If you’d rather I not publish, or you’d like different naming/credit wording, please say so. Happy to collaborate or adjust.

For the technical fence questions (expanded for someone who hasn’t touched the code in a while), copy from [UPSTREAM-FENCES.md](./UPSTREAM-FENCES.md) § **Suggested message for upstream**. You can send Marketplace courtesy and fences as one issue or two.

Track their reply (if any) before you treat Marketplace publish as “cleared socially.”

### 2. Confirm Marketplace publisher identity

1. Open [Visual Studio Marketplace publisher management](https://marketplace.visualstudio.com/manage).
2. Ensure a publisher whose **ID** is exactly `eunomiac` (must match `package.json` → `publisher`). Create it if needed ([docs](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)).
3. Create a Personal Access Token with Marketplace publish rights as described in those docs; store it somewhere safe (not in git).

### 3. Dependency / license scan (before first public release)

From `tts-tools/packages/tts-editor` (after `npm install`):

```bash
npx license-checker --production --summary
```

Skim for copyleft surprises. Update `NOTICE` if anything material is missing.
(Optional later: `npx @vscode/vsce ls` to see what ships inside the VSIX.)

### 4. Decide when to publish (product readiness)

Do **not** rush a public listing until you are happy for strangers to install it. Minimum bar suggestion:

- [ ] Epic A (fast Save & Play sync) working enough that you won’t shame the fork on day one — *or* publish later when gateway work lands; your call
- [ ] README describes what works *today* (no vaporware gateway promises on the Marketplace page)
- [ ] You’ve used Save & Play + Get Objects on Toronto Rising after a fresh VSIX install

### 5. Package and upload

Local package (already wired):

```bash
cd D:\Projects\.CODING\tts-tools
npm run package
```

That writes `dist/tts-tools.vsix`. Then either:

- `npx @vscode/vsce publish` from `packages/tts-editor` (with login/PAT), or
- Upload the VSIX manually in the publisher management UI

Follow Microsoft’s current [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

### 6. Marketplace listing polish (you in the UI)

- [ ] Screenshots / gif that show *your* fork (don’t imply it’s Stern’s listing)
- [ ] Categories / tags accurate
- [ ] Q&A / overview text repeats: community fork, MIT, credit upstream, unofficial wrt Berserk Games
- [ ] Repository and support links point at **Eunomiac/tts-tools**

### 7. After publish — user migration note

For yourself and anyone else on the original:

- [ ] Uninstall or disable `sebaestschjin.tts-editor` if both would fight over port **39998**
- [ ] Install `eunomiac.tts-tools`
- [ ] Document that in Toronto Rising setup notes if needed

### 8. Optional later

- [ ] Verified publisher badge (Microsoft domain/age rules — see publishing docs)
- [ ] Open VSX if you care about non-Microsoft stores (separate account/process)
- [ ] Bump extension `version` intentionally for each public release (don’t leave forever at `2.1.3` once you ship fork-only features)
- [ ] If you change icons substantially, keep Flaticon attribution or replace assets cleanly

---

## What not to do

- Do not publish under publisher id `sebaestschjin`
- Do not remove Sebastian Stern’s MIT copyright from `LICENSE`
- Do not claim official Berserk Games / Tabletop Simulator endorsement
- Do not put PATs, certificates, or Marketplace secrets in git

---

## Questions only you can answer

| Question | Your note |
| --- | --- |
| Did upstream reply / any naming preference? | |
| Publish now vs after Epic A / gateway? | |
| Public Marketplace vs sideload-only for a while? | |
