## Left Sidebar Menus

For now, skip implementation of any menus that are noted as "yet to be implemented"; the data is only partly in place for them. Do still add the menu buttons and placeholder text for the dropdown menus, however. (All glyphs for the menu icons can be found in `public/assets/icons/left_panel`)

### Domains

(Yet to be implemented.)

### Coteries

(Yet to be implemented.)

### Hunting

The hunting dropdown menu should include eight entries, with the first entry separated slightly from the other seven (just as "regions" are separated from "districts" in the Map Layers menu).

1. "ALL" -- This is the default view. When this entry is selected, each District on the map should receive a red fill whose opacity scales with its Hunting Difficulty.  Hunting Difficulties range from 2 to 6. The higher the hunting difficulty, the lower the opacity of the overlay fill. Some Districts have a Hunting Difficulty of "~", and these districts should receive no fill at all. The maximum opacity should not be 1; map features should still be visible underneath.

2. "Choleric" -- The first of the seven flavors of Resonance. If this is selected, only those Districts with a value of "choleric +" in their "Resonance Plus" export data should receive their scaled opacity fill as described for "ALL".
3. "Melancholic" -- As above, except filtered for "melancholic +"
4. "Phlegmatic" -- As above, except filtered for "phlegmatic +"
5. "Sanguine" -- As above, except filtered for "sanguine +"
6. "Primal" -- As above, except filtered for "primal +"
7. "Ischemic" -- As above, except filtered for "ischemic +"
8. "Mercurial" -- As above, except filtered for "mercurial +"

In addition, the new "Aspect Advantage" column should also be checked, and the following adjustments should be made to any District that receives a hunting overlay via one of the above selections.

* If "Aspect Advantage" is a `+` -- The District __label__ should be increased in size and slightly brightened, with a slightly thicker stroke.
* If "Aspect Advantage" is a `−` -- The District __label__ should be decreased in size, styled with italics, and slightly dimmed.
* Otherwise, the district label should be displayed as normal.

### Homestead

The homestead menu should contain four values (all occupying the same 'section', with no sectional divisions between them). Each menu item should display both the text name and its corresponding icon, which can be found in `/public/assets/icons/left_panel/homestead`:

1. "Affair"
2. "Association"
3. "Clout"
4. "Utility"

When any of these are selected, similar to the variable-opacity overlays we used for the Hunting overlays, each District in the city should get a #FFDD00 overlay with varying opacity levels corresponding to the value they have for the corresponding Homestead trait. Homestead values range from 0 to 6.

- Only one District has a value of 0 for each Homestead trait, and this District should receive no overlay highlighting, just as with a Hunting value of "~"
- Only one District has a value of 6 for each Homestead trait, and this District should get the brightest overlay highlighting _as well as_ the same pulsing border animation we use for selected districts, except with a #FFDD00 glow instead of red.
- Values between 1 and 5 should get correspondingly brighter values as the Homestead value increases.

As with Hunting, the maximum opacity should be sufficiently lower than 1 so that map features remain visible underneath.

In addition, a box-text paragraph describing the selected Homestead trait should be displayed in a floating box somewhere onscreen. The text for each box is as follows:

#### Affair

> ## Affair — Economic Value and Activity
> Affair represents the economic character of a location, encompassing its property values, commercial activity, employment opportunities, and overall financial prosperity. It considers the wealth generated or concentrated within an area, including businesses, residential properties, rents, taxes, and other financial transactions. A prosperous financial district with valuable real estate and thriving businesses would have a high Affair rating, while an economically depressed neighborhood with abandoned properties, limited employment, and little commercial activity would generally have a low rating.

#### Association

> ## Association — Connectivity and Integration
> Association measures how closely a location is connected to the larger city, both physically and socially. It considers access to transportation networks, major roads, commercial centers, cultural landmarks, and other important destinations, as well as the area's population and relationship to the surrounding urban environment. A bustling neighborhood with excellent public transit, significant cultural attractions, and strong connections to other districts would have a high Association rating, while an isolated residential enclave with limited accessibility and few connections to the broader city would have a low rating.

#### Clout

> ## Clout — Physical Presence and Security
> Clout represents the physical characteristics of a location, particularly its size, construction, structural integrity, prominence, and security. It reflects the tangible qualities that determine how imposing, accessible, defensible, or physically significant an area or property might be. A massive skyscraper with sophisticated security systems would possess high Clout, while a modest, poorly maintained building with minimal protection would have low Clout. At the neighborhood level, Clout can reflect building density, architectural character, physical barriers, and the general security of properties.

#### Utility

> ## Utility — Infrastructure and Public Services
> Utility measures the quality, availability, and reliability of the infrastructure and services supporting a location. It encompasses essential provisions such as electricity, clean water, sanitation, road maintenance, emergency services, healthcare access, and environmental conditions. An affluent neighborhood with dependable utilities, well-maintained streets, effective municipal services, and convenient access to hospitals would generally possess high Utility. Conversely, an underserved district suffering from deteriorating infrastructure, pollution, inadequate public services, or unreliable utilities would have a low rating.