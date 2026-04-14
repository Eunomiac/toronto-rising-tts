PROMPT INDEX BY ID
- RUMOR_MILL
- QUIZ_GENERATION
- SITE_GENERATION
- NPC_GENERATION
- IMAGE_GENERATION


PROMPT ID: RUMOR_MILL
PROMPT START
Review the list of rumors below. Generate 10 new rumors.

1. Voice and format
1.1 Each rumor is an in-world snippet of overheard talk, suited to Elysium.
1.2 Start mid-sentence, as if the listener missed the beginning.
1.3 End mid-sentence, as if the speaker walked out of earshot.
1.4 Keep each rumor short. Target one line. Hard cap two lines.
1.5 Keep each rumor fragmentary. One idea per rumor.
1.6 Use straight quotes only. Avoid smart quotes.
1.7 Use "..." (three periods) instead of the ellipsis character.

2. Content focus
2.1 Favor NPCs and factions over PCs.
2.2 Pull names, titles, domains, and relationships from the project NPC files when useful.
2.3 Keep details suggestive, not definitive. Rumors should not read like a briefing.

3. Variety targets for the set of 10
Include a mix across the full set:
- A tidbit that introduces an NPC or coterie.
- A warning about an emerging threat to the Prince's Court.
- A jab, insult, or doubt aimed at the Court's competence.
- A rumor that contradicts an older rumor in the list.
- A plot hook tied to boons, feeding rights, domain disputes, scandals, or missing persons.
- A Masquerade risk or cover-up.
- A hint of outside pressure (Anarch agitation, independents, hunters, or other sect interference).

4. Second pass length check
4.1 After drafting all 10, compare length to the existing rumor list.
4.2 Shorten any rumor that feels longer or denser than the typical entries.
4.3 If a rumor names too many people or places, cut all but one.

5. Output
5.1 Output a single plain text code block.
5.2 One rumor per line.
5.3 No numbering. No extra commentary before or after.
PROMPT END

PROMPT ID: QUIZ_GENERATION
PROMPT START
Review the list of previously-presented quizzes below. Use that list as a guide. Follow these steps to generate a new quiz.

1. Choose subject area
1.1 Read the most recent quizzes near the bottom of the list.
1.2 Pick one approach: NARRATIVE or MECHANICAL.
A. NARRATIVE
- Favor questions about NPCs and coteries described in `NPCS_CAMARILLA.md` if possible
- Focus on setting history, sect politics, Kindred history, clans, institutions, events, consequences, and related lore.
- Write from an in-world narrator viewpoint.
- Avoid game terms and above-the-table language.
B. MECHANICAL
- Ask about rules, systems, procedures, or mechanics.
1.3 Prefer NARRATIVE unless several NARRATIVE quizzes appear in a row. If a recent quiz used MECHANICAL, avoid MECHANICAL this time.

2. Devise five possible questions
2.1 Draft five questions tied to the chosen subject area.
2.2 Aim for medium difficulty.
- Avoid massive events every fan knows.
- Avoid niche trivia that frustrates average players.

3. For each drafted question, identify topics, then check for repeats
3.1 Build a subject term list for the question.
- Use 3 to 8 terms.
- Favor named and distinctive terms: named pacts, treaties, decrees, wars, cities, institutions, titles, clans, bloodlines, key figures, signature rites, signature banes.
- Avoid broad terms alone (Camarilla, Anarch, Elysium). Pair broad terms with a specific named item.
- Format as a comma-delimited string.
Example: The Promise,Giovanni,1528

3.2 Call the Quiz Keyword Checker action once per drafted question.
Send:
```json
{"keyword":"The Promise,Giovanni,1528"}
```

3.3 Review the returned JSON.
- matches[] contains prior quiz questions with overlapping subject terms.
- foundSubjects lists the matched subject terms for each returned prior question.

3.4 Decide if the drafted question repeats an older quiz.
A repeat means the same core fact gets tested, with the same correct answer for the same reason, even with different wording.
Compare:
- The intended correct answer.
- The specific event, term, or rule being tested.
- The distinguishing detail: date, location, actor, exception, consequence, or limiting clause.
Discard the drafted question if the intended correct answer matches and the tested event or term matches, and the distinguishing detail does not meaningfully differ.

3.5 If matches feel noisy or irrelevant, tighten the subject term list and rerun the action for that drafted question.

3.6 If the action fails or returns unusable data, stop. Prompt the user for further instructions.

3.7 Keep the final subject term list for each drafted question. Output the final list later in the Subject column.

4. For each remaining question, articulate an objective answer
4.1 Write the correct answer in a precise form.
4.2 Discard questions with ambiguous, interpretive, overly broad, or subjective answers.

5. For each remaining question, devise three credible but unambiguously wrong answers
5.1 Create three wrong options that sound plausible but are false.
5.2 Avoid wrong options that rely on vague phrasing or broad wording.
5.3 Randomly choose which letter holds the correct answer among A to D.
5.4 Leave Option E to Option G empty.

6. For each remaining question, write Answer Text
6.1 Keep Answer Text short.
6.2 Aim for a few words.

7. For each remaining question, write Answer Explanation
7.1 Write one or two paragraphs.
A. If the chosen approach was NARRATIVE
- Write as a World of Darkness expert voice.
- Add interesting supporting facts and trivia, even when not required for the answer, while staying in-world.
- Avoid edition talk and metaplot language.
- Present information as historical record, sect gossip treated cautiously, or common Kindred consensus.
- Add one clear connection to modern nights when possible: political fallout, current faction behavior, how Courts address the issue today, or a recent shift raising stakes.
- Add one or two contextual details: key figures, consequences, political consequences, related institutions, or a specific memorable detail.
B. If the chosen approach was MECHANICAL
- State rules-as-written.
- Explain common pitfalls and confusion points.

7.2 If helpful, briefly situate incorrect options with neutral clarifications focused on why each option does not apply.

8. Format each question as a pipe-delimited row
8.1 Output one row per question with these columns in order:
Question|Option A|Option B|Option C|Option D|Option E|Option F|Option G|Correct Choice|Answer Text|Answer Explanation|Subject
8.2 Leave unused options empty, but keep the pipes so columns stay aligned.
8.3 Do not include the header row in the output rows.

9. Respond with two outputs
9.1 A readable summary for the user.
- Show approved questions first.
- Then show discarded questions and the discard reason.
9.2 A single code block with one pipe-delimited row per drafted question.
- Include all five drafted questions, including discarded.
- Separate approved from discarded inside the code block with a line containing only: ---
PROMPT END

PROMPT ID: SITE_GENERATION
PROMPT START
Goal: create the next infographic entry in the "Sites of Toronto" series.

0. Identify the target site
0.1 Review the list below.
0.2 Treat entries with paragraph descriptions as completed examples.
0.3 Treat entries with bullet points only as incomplete.
0.4 Locate the entry for: BAY WELLINGTON TOWER
0.5 If the site value given in step 0.4 starts with "SITE_SELECTION_ERROR:", stop and ask the user which site to use tonight.
0.6 Use any bullet point guidance under that site header as requirements.

1. Study the completed examples
1.1 Read several completed site entries.
1.2 Match their typical length, tone, and level of detail.
1.3 Use the same voice as the completed entries.

2. Required output format
Your response must include three sections in this exact order.

2.1 Image:
- Display the generated image in the response.
- No overlaid text in the image.

2.2 Description:
- Provide the final description inside a simple text code block.
- Raw text only. No citations. No inline formatting.

2.3 Prompt Used:
- Provide the exact image prompt inside a code block.
- Verbatim prompt text, copy and paste exact string.

3. Task 1: write the site description
3.1 Write a single paragraph description for the site.
3.2 Include true facts about the real Toronto location.
3.3 Incorporate all bullet point guidance from the site entry.
3.4 Keep the content in line with the completed examples.
3.5 Before output, do a length pass:
- Compare against completed entries.
- Shorten until it matches typical length and density.

4. Task 2: generate a photorealistic night image (widest supported landscape ratio)
4.1 Depict the site as it appears in the present day.
4.2 Exterior view. Late at night.
4.3 Insist on a dark or black sky. Avoid sunrise or sunset lighting.
4.4 Incorporate any bullet point guidance about depiction.
4.5 Photorealistic look:
- many small details
- realistic lighting
- reflections and glare or bloom where appropriate
- depth of field
- motion blur only if context supports it
4.6 Composition requirement:
- place the site on the left third of the frame
- leave clean negative space on the right side for later text overlay
4.7 No text, signs, captions, or watermarks added to the image.

4.8 Aspect ratio requirement:
- Use the widest supported landscape aspect ratio.
- Compose with extra right-side negative space so cropping to 2:1 stays clean.

5. Output details
5.1 Section headings must read exactly:
Image:
Description:
Prompt Used:

5.2 In the Description section, use a code block in the final response:
```text
[final paragraph description]
```

5.3 In the Prompt Used section, use a code block in the final response:
```text
[exact image prompt used]
```
PROMPT END

PROMPT ID: NPC_GENERATION
PROMPT START
Task: write the next coterie introduction infographic for THE WYCHWOOD HECATA

1. Read source sections
1.1 Read the section titled: the Wychwood Hecata.
1.2 Read the completed examples: The Five Keys and The Moon Club.
1.3 Match their voice, structure, and length.

2. Output required parts
2.1 Player Introduction
- Write the same style used in the completed coterie entries.
- Include the line that starts with: "How long before ..."
- Include the line that starts with: "They represent your greatest rivals in Toronto: ..."
- Keep tone in-world and courtly. Keep it compact.

2.2 Member descriptions
- For each member header under the Wychwood Hecata section, write a description.
- Use the bullet point notes under each member as requirements, not suggestions.
- Match the approximate length of the member descriptions in the completed coteries.
- Focus on role, reputation, motives, and what makes them dangerous or useful.
- Do not add extra members.

2.3 Member quotes
- Write one quote per member.
- Make each quote distinct in voice.
- Keep each quote dramatic and memorable.
- Ensure each quote fits the character's feel from the notes.

3. Consistency checks
3.1 Names, titles, clans, and roles must match the notes.
3.2 Tone must match the completed coterie examples.
3.3 Avoid out-of-world language and rules terms.

4. Output format
4.1 Present the Player Introduction first.
4.2 Then list each member in the same order as the Wychwood Hecata section.
For each member, output:
- Name line
- Description paragraph
- Quote line in straight quotes

5. Do not include process notes or commentary.
PROMPT END

PROMPT ID: IMAGE_GENERATION
Task: Generate a photorealistic nighttime image representing a district of Toronto for a Vampire: the Masquerade chronicle titled **Toronto Rising**. These images are part of a cohesive visual set and must feel like they belong to the same game world while maintaining strong visual distinction between districts.

1. Establish Core Visual Language
- All district images must share the following **Toronto Rising Cinematic Style** traits:
* Nocturnal, moody atmosphere.
* High contrast but not crushed blacks.
* Subtle atmospheric haze or mist to catch light.
* Sharp architectural definition.
* Realistic urban lighting (no fantasy glow).
* Slightly heightened cinematic exposure (grounded but dramatic).
* Subtle wetness or reflective surfaces unless thematically inappropriate.
* Viewer feels physically *inside* the district, not observing from afar.
* Slight undertone of danger or tension (never cheerful).
* No visible readable text.
* No UI elements.
* No graphic overlays.
* Must read as realistic photography, not illustration.
- Maintain lighting realism and tonal consistency across all districts so they feel like part of the same "game world."

2. Determine District Tonal Identity
- Before generating, determine the district's visual identity by combining:
2.1 The shared Toronto Rising style.
2.2 The district's assigned theme.
- The theme should meaningfully influence:
* Color palette
* Lighting behavior
* Density
* Architecture emphasis
* Emotional tone
- Do NOT default to previous district color schemes unless the theme truly calls for it.
- Ensure 2—3 dominant colors guide the scene's lighting and reflections.
- Lighting must reinforce the theme, not contradict it.
- The emotional tone must be visible in composition and lighting.
- Composition should naturally highlight theme-defining elements without overpowering what makes the district recognizable.
- Actively exclude elements listed in the theme's AVOID section.

3. Composition Requirements (MANDATORY)
- Ensure the generated image meets ALL of the following requirements:
* Black letterbox bars at top and bottom (solid black).
* The active image content must occupy a wide horizontal band in the center.
* Wide-angle lens feel (approx. 24—35mm equivalent).
* Foreground presence + midground + background visible.
* Landmark or defining district features fully visible and not clipped.
* Moderate upward perspective (not extreme distortion).
* Avoid excessive vertical bias.
* Leave subtle negative space suitable for UI overlay.
* Do not crop or obscure defining landmark features.
- The image must feel cinematic and intentionally framed.

4. District Recognition Rule
- The image must clearly read as the specified district — not generic Toronto.
- Include recognizable architectural, geographic, or cultural markers specific to that district.
- Do not default to skyline-only imagery.
- Do not substitute a similar-looking neighborhood.
- If unsure about defining landmark or identity, pause and ask for clarification before generating.

5. Visual Distinction Requirement
- Although all images share the Toronto Rising cinematic style, each district must:
* Have a distinct palette.
* Have distinct lighting behavior.
* Have a distinct emotional temperature.
* Avoid looking like a recolored version of another district.
- Consistency in style.
- Variation in tone.

6. Image Request
- Now refer back to the user's prompt, which will contain the specific district for which you will be generating an image, as well as the district's assigned theme
- Perform any necessary research to gather distinct characteristics to depict in the image, and ask any clarifying questions you need of the user
- Once you have the information you need, proceed immediately to generate the image.