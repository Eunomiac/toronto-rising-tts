# Line-By-Line Breakdown of All Code Files

Normative formats, paths, and validation rules for the pipeline live in [CODE_REVIEW_PIPELINE.md](CODE_REVIEW_PIPELINE.md).

I'd like your help refining, fine-tuning, and redesigning (if necessary) a structured code analysis whereby we leverage agentic technologies available through Cursor to perform an exhaustive review of the entire code base from several "perspectives". By starting large and general (defining project scope, defining requirements, defining standards, assessing file structure, organization, build tools, globals, common libraries), initial agents could lay down structural data that subsequent agents can flag for their own more narrowly defined tasks.

## Retro-collaborative Code Review

I'm calling this "retro-collaborative" because it isn't just the later agents collaborating with those who came before: those earlier agents were anticipating and laying down scaffolding for those subsequent agents to use. So it goes both ways.

There are two ways that we could go about this: We could store agent output in a separate csv file, or we could insert agent output in the `.ttslua` file itself, within uniquely-formatted code block that are easily searched and located.  I'm not sure which would be better, but I'll move forward with the `.csv` method, and then briefly overveiw the inline method.

### CSV File vs. Inline Comments

Consider a file with several thousand lines of code. Would an agent be able to work iteratively through this while keeping an external CSV file updated, without getting lost? This is the one real disadvantage here to inline comments -- my instincts are telling me that it would be easier on the agent if they could write their comments directly next to the code being analyzed.  If not, agents would work with `#regions` defining blocks of code that share similar purposes, functionality, or other reason (good or bad) for being together. **All Code** (including comments) will ultimately be included within these region blocks, separating the file with full coverage, and defined by, e.g., `-- #region ::== [100] Hard-Coded Configuration Settings ==::`/`-- #endregion ::== [100] ==::`. The number will start at 100 and increment by the same when regions are first constructed, allowing room for new regions to be added in between should they be required without having to reassign all the numbers to maintain sequentiality.

### The First Agent: The Architect

The first agent, hereinafter known as "the Architect", reviews each file and separates it into top-level `#region` blocks with an appropriate title. Then, after confirming that all code has been covered by such regions, it logs each region into its row in the CSV file. THis first agent might generate a file that looks like this:

```csv
file,regionNum,title,classification,description,notes,tags
core/lighting.ttslua,100,Hard-Coded Configuration Settings,,,,
core/lighting.ttslua,200,Lighting Initialization,,,,
core/lighting.ttslua,300,Helper Function: `getEase()`,,,,
core/lighting.ttslua,400,Lighting Initialization #2,,,,
...
```

Note the obvious indication that a helper function has been misplaced -- and that's fine at this early stage. It's the job of other agents to find problems; this initial agent only identifies and separates. If a file is incredibly disorganized, this may well result in a top-level region for every function. Subsequent agents will resolve this.

Note: "The First Agent" _may_ be a misnomer; if this part proves more complicated than I intuit, we might need multiple "architects" to iterate through to a solution.

### Subsequent Agents: Focused Tasks

I thought it would be more effective (if less efficient) to give several agents specific instructions to look for specific problems, rather than to give one agent a general "review this codebase" instruction. In essence, each of these agents will iterate through the regions defined in the CSV file, looking into their specific focus, and updating the CSV with their findings --- NOT editing any code, just logging what they see (for now).

#### The Summarizer

For example, let's say we run a "summarizing" agent next, immedaitely after the Architect. Its only job is to fill in the "Classification" and "Description" columns for each of the regions defined by the Architect, providing a grounding summary to each agent that comes after:

```csv
file,regionNum,title,classification,description,notes,tags
core/lighting.ttslua,100,Hard-Coded Configuration Settings,Configuration,Hard-coded configuration settings for the lighting module.
core/lighting.ttslua,200,Lighting Initialization,Initialization,Public methods exclusively called during the coordinated onLoad initialization sequence.
core/lighting.ttslua,300,Helper Function: `getEase()`,Helper Function,Single helper for acquiring ease curves for animation of lights.
core/lighting.ttslua,400,Lighting Initialization #2,Initialization,Additional public methods exclusively called during the coordinated onLoad initialization sequence.
core/lighting.ttslua,500,Lighting Mode Definitions,Configuration,Defining LightingModes for various components and scenes.
core/lighting.ttslua,600,Lighting Mode Controllers,Main Implementation,Public methods that allow controlling in-game lights.
...
```

#### The Organizer

At this point, we likely have a lot of orphaned "Helper Function"-style code blocks. And, importantly, we can frequently tell from the descriptions when these disorganized blocks are misplaced. So we spin up another "Organizer" agent and task them with reviewing the CSV file for obvious organizational difficulties, and drafting a plan to solve them, while ensuring the CSV file remains updated through region creation/destruction. Perhaps their plan ends up looking like:

```md
1. (Region 300) Relocate `getEase()` helper function to `core/utilities.ttslua` (Region 800: Easing Functions)
   a. remove Region 300 from codebase and CSV
2. (Region 400) Merge lighting intiialization functions into Region 200 Lighting Initialization
   a. remove Region 400 from codebase and CSV
3. (Region 500) Merge lighting definitions into Region 100 Configuration Settings
   a. remove Region 500 from codebase and CSV
```

... which, when approved and implemented, should result in something like this (and code that matches):

```csv
file,regionNum,title,classification,description,notes,tags
core/lighting.ttslua,50,Imports,Import,Imported dependencies.
core/lighting.ttslua,100,Hard-Coded Configuration Settings,Configuration,Hard-coded configuration settings for the lighting module.
core/lighting.ttslua,200,Lighting Initialization,Initialization,Public methods exclusively called during the coordinated onLoad initialization sequence.
core/lighting.ttslua,600,Lighting Mode Controllers,Main Implementation,Public methods that allow controlling in-game lights.
...
```

The above shows an example CSV after our Architect, Summarizer, and Organizer have run. What follows are the even more-specialized agents, each tasked with locating specific issues:

- Organization: Code that would be better located in a more appropriate file, file sections that are not in logical order (e.g. Initialization functions not at top)
- Duplication: The code either _does_ duplicate existing code, or it _might_ duplicate existing code (i.e. if you suspect a certain helper function likely exists in some form in the utilities library), or it _should_ duplicate existing code (i.e. if this helper function _should_ already exist in utilities -- and should be added if not), mark it as (possible) code duplication.
- Redundancy: Slightly broader than code duplication, this flags code that does something _very similar_ to something else we do (e.g. a helper function that builds animation sequences comprised of lerping colors, which is quite similar to our position/rotation/lighting-params lerping --- which has several very powerful functions that might be better adapted to this use case instead of the existing code trying to figure it out itself)
- Consolidation: The lovechild of Organization and Duplication: This suggests one or more possible better locations for this code: either explicit sections it should be moved to, or suggestions to create a section for this and similar code (e.g. "we're making a lot of dynamic XML changes; we should have a central pipeline to handle this")
- Code Smell: Something fishy or unconventional is being done here, and we should check to make sure the _actual_ problem is being addressed _appropriately_ (rather than hacked or worked-around). This assessment should be based on the actual line-by-line mechanics of the function: What is it _doing_ here, and is it doing something fishy?
- Obsolete: Comments or code that are no longer necessary to the current functionality of the app. This includes code included for "backwards compatibility" (we need no backwards compatibility), as well as comments describing changes or past behavior --- comments should describe what the code _is_, never what it _was_
- Scaling: If functionality that, intuitively, will have to be scaled up (e.g. one phase/scene -> multiple phases/scenes; one player -> five players) and the functioanlity is not sufficiently capable of foreseeable scaling
- Breaking Errors: Code that isn't sufficiently protected against bad data, or that is intended to throw a breaking error without presenting accurate, informative, and thorough information to the Host/Black player.

When any of these agents find an example of their assigned task, they append a TAG to the appropriate row of the CSV file, in the tags column. For example, I've given an agent the named "Consolidation", and told it to survey regions one at a time looking for potential cases where we could consolidate our code base a bit better. When it finds a possible instance, or something to check, it should add its tag to the proper region in the CSV file, e.g., `[Consolidation] Should these helper functions be better placed in utilities.ttsulua?`.

After "Consolidation" has run on our codebase, we might have a CSV file that looks like this:

```csv
file,regionNum,title,classification,description,notes,tags
core/lighting.ttslua,50,Imports,Import,Imported dependencies.,,
core/lighting.ttslua,100,Hard-Coded Configuration Settings,Configuration,Hard-coded configuration settings for the lighting module.,,[Consolidation] Could some of these be moved into our central `constants.tts` library?
core/lighting.ttslua,200,Lighting Initialization,Initialization,Public methods exclusively called during the coordinated onLoad initialization sequence.,,
core/lighting.ttslua,600,Lighting Mode Controllers,Main Implementation,Public methods that allow controlling in-game lights.,,[Consolidation] Ensure "SetLightMode" is the only place in code where the light component is modified: other examples are likely code duplication
...
```

From there, we could either run more agents with focused tasks, or spin up an agent similar to the "Organizer", who actually solves issues flagged in the CSV (and keeps the CSV updated while doing it).

### Questions & Concerns

- Is there a better way to do this?  I'm trying to get over the obstacle of LLMs having limited context windows (i.e. ability to fully "grok" the entire codebase at once), and the tendency to fixate on one category of issue over others when instructions are too broad.
- We should be able to implement several automated verifications throughout this process. For example, a .py or .js script that scans for #regions in the codebase and confirms the CSV registry matches
- I am not an expert when it comes to LLMs, Agents or the like.  I need you to dig deep into your awareness of that expertise to really stress test my plans in your head (so to speak). I mean, I've either invented an incredibly useful and brilliant method of agentic code review that should scale well at least to some degre... or I just spent two hours "solving" a problem that has been solved before me, and far better than me!
