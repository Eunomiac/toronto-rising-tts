--[[    Character Sheet Template    by: MrStump

You can set up your own character sheet if you follow these steps.

Step 1) Change the character sheet image
    -Right click on the character sheet, click Custom
    -Replace the image URL with one for your character sheet
    -Click import, make sure your sheet loads
    -SAVE THE GAME (the table setup)
    -LOAD FROM THAT SAVE YOU JUST MADE

Step 2) Edit script to fit your character sheet
    -Below you will see some general options, and then the big data table
    -The data table is what determines how many of which buttons are made
        -Checkboxes
        -Counters
        -Textboxes
    -By default, there are 3 of each. You can add more or remove entries
    -If you intend to add/remove, be sure only to add/remove ENTRIES
        -This is what an entry looks like:
            {
                pos   = {-0.977,0.1,-0.589},
                size  = 800,
                state = false
            },
        -Deleting the whole thing would remove that specific item on the sheet
        -Copy and pasting it after another entry would create another
    -Each entry type has unique data points (pos, size, state, etc)
        -Do not try to add in your own data points or remove them individually
        -There is a summary of what each point does at the top of its category

Step 3) Save and check script changes
    -Hit Save & Apply in the script window to save your code
    -You can edit your code as needed and Save+Apply as often as needed
    -When you are finished, make disableSave = false below then Save+apply
        -This enables saving, so your sheet will remember whats on it.

Bonus) Finding/Editing Positions for elements
    I have included a tool to get positions for buttons in {x,y,z} form
    Place it where you want the center of your element to be
    Then copy the table from the notes (lower right of screen)
        You can highlight it and CTRL+C
    Paste it into the data table where needed (pos=)
    If you want to manually tweek the values:
        {0,0,0} is the center of the character sheet
        {1,0,0} is right, {-1,0,0} is left
        {0,0,-1} is up, {0,0,1} is down
        0.1 for Y is the height off of the page.
            If it was 0, it would be down inside the model of the sheet

Begin editing below:    ]]

--Set this to true to disable automatic update of
--health and willpower trackers based on attributes
disableUpdateTrackers = false

--Set this to an integer value to modify your maximum health and willpower tracker
maxhealthmod = 0
maxwillpowermod = 0

--Set this to true while editing and false when you have finished
disableSave = false
--Remember to set this to false once you are done making changes
--Then, after you save & apply it, save your game too

--Color information for button text (r,g,b, values of 0-1)
buttonFontColor = {0,0,0}
--Color information for button background
buttonColor = {1,1,1}
--Change scale of button (Avoid changing if possible)
buttonScale = {0.1,0.1,0.1}

--This is the button placement information
defaultButtonData = {
    --Add checkboxes
    checkbox = {
        --[[
        pos   = the position (pasted from the helper tool)
        size  = height/width/font_size for checkbox
        state = default starting value for checkbox (true=checked, false=not)
        ]]
        --Strength
        {pos   = {-0.7700,0.1,-1.03}, size  = 160, state = false, tag = "str"},
        {pos   = {-0.7165,0.1,-1.03}, size  = 160, state = false, tag = "str"},
        {pos   = {-0.6630,0.1,-1.03}, size  = 160, state = false, tag = "str"},
        {pos   = {-0.6095,0.1,-1.03}, size  = 160, state = false, tag = "str"},
        {pos   = {-0.5560,0.1,-1.03}, size  = 160, state = false, tag = "str"},
        --Dexterity
        {pos   = {-0.7700,0.1,-0.923}, size  = 160, state = false, tag = "dex"},
        {pos   = {-0.7165,0.1,-0.923}, size  = 160, state = false, tag = "dex"},
        {pos   = {-0.6630,0.1,-0.923}, size  = 160, state = false, tag = "dex"},
        {pos   = {-0.6095,0.1,-0.923}, size  = 160, state = false, tag = "dex"},
        {pos   = {-0.5560,0.1,-0.923}, size  = 160, state = false, tag = "dex"},
        --Stamina
        {pos   = {-0.7700,0.1,-0.816}, size  = 160, state = false, tag = "sta"},
        {pos   = {-0.7165,0.1,-0.816}, size  = 160, state = false, tag = "sta"},
        {pos   = {-0.6630,0.1,-0.816}, size  = 160, state = false, tag = "sta"},
        {pos   = {-0.6095,0.1,-0.816}, size  = 160, state = false, tag = "sta"},
        {pos   = {-0.5560,0.1,-0.816}, size  = 160, state = false, tag = "sta"},

        --Charisma
        {pos   = {0.1122,0.1,-1.03}, size  = 160, state = false, tag = "cha"},
        {pos   = {0.1657,0.1,-1.03}, size  = 160, state = false, tag = "cha"},
        {pos   = {0.2192,0.1,-1.03}, size  = 160, state = false, tag = "cha"},
        {pos   = {0.2727,0.1,-1.03}, size  = 160, state = false, tag = "cha"},
        {pos   = {0.3262,0.1,-1.03}, size  = 160, state = false, tag = "cha"},
        --Manipulation
        {pos   = {0.1122,0.1,-0.923}, size  = 160, state = false, tag = "man"},
        {pos   = {0.1657,0.1,-0.923}, size  = 160, state = false, tag = "man"},
        {pos   = {0.2192,0.1,-0.923}, size  = 160, state = false, tag = "man"},
        {pos   = {0.2727,0.1,-0.923}, size  = 160, state = false, tag = "man"},
        {pos   = {0.3262,0.1,-0.923}, size  = 160, state = false, tag = "man"},
        --Composure
        {pos   = {0.1122,0.1,-0.816}, size  = 160, state = false, tag = "com"},
        {pos   = {0.1657,0.1,-0.816}, size  = 160, state = false, tag = "com"},
        {pos   = {0.2192,0.1,-0.816}, size  = 160, state = false, tag = "com"},
        {pos   = {0.2727,0.1,-0.816}, size  = 160, state = false, tag = "com"},
        {pos   = {0.3262,0.1,-0.816}, size  = 160, state = false, tag = "com"},

        --Intelligence
        {pos   = {0.9932,0.1,-1.03}, size  = 160, state = false, tag = "int"},
        {pos   = {1.0467,0.1,-1.03}, size  = 160, state = false, tag = "int"},
        {pos   = {1.1002,0.1,-1.03}, size  = 160, state = false, tag = "int"},
        {pos   = {1.1537,0.1,-1.03}, size  = 160, state = false, tag = "int"},
        {pos   = {1.2072,0.1,-1.03}, size  = 160, state = false, tag = "int"},
        --Wits
        {pos   = {0.9932,0.1,-0.923}, size  = 160, state = false, tag = "wit"},
        {pos   = {1.0467,0.1,-0.923}, size  = 160, state = false, tag = "wit"},
        {pos   = {1.1002,0.1,-0.923}, size  = 160, state = false, tag = "wit"},
        {pos   = {1.1537,0.1,-0.923}, size  = 160, state = false, tag = "wit"},
        {pos   = {1.2072,0.1,-0.923}, size  = 160, state = false, tag = "wit"},
        --Resolve
        {pos   = {0.9932,0.1,-0.816}, size  = 160, state = false, tag = "res"},
        {pos   = {1.0467,0.1,-0.816}, size  = 160, state = false, tag = "res"},
        {pos   = {1.1002,0.1,-0.816}, size  = 160, state = false, tag = "res"},
        {pos   = {1.1537,0.1,-0.816}, size  = 160, state = false, tag = "res"},
        {pos   = {1.2072,0.1,-0.816}, size  = 160, state = false, tag = "res"},

        --Athletics
        {pos   = {-0.711,0.1,-0.402}, size  = 160, state = false, tag = "athl"},
        {pos   = {-0.6575,0.1,-0.402}, size  = 160, state = false, tag = "athl"},
        {pos   = {-0.604,0.1,-0.402}, size  = 160, state = false, tag = "athl"},
        {pos   = {-0.5505,0.1,-0.402}, size  = 160, state = false, tag = "athl"},
        {pos   = {-0.497,0.1,-0.402}, size  = 160, state = false, tag = "athl"},
        --Brawl
        {pos   = {-0.711,0.1,-0.2909}, size  = 160, state = false, tag = "brwl"},
        {pos   = {-0.6575,0.1,-0.2909}, size  = 160, state = false, tag = "brwl"},
        {pos   = {-0.604,0.1,-0.2909}, size  = 160, state = false, tag = "brwl"},
        {pos   = {-0.5505,0.1,-0.2909}, size  = 160, state = false, tag = "brwl"},
        {pos   = {-0.497,0.1,-0.2909}, size  = 160, state = false, tag = "brwl"},
        --Craft
        {pos   = {-0.711,0.1,-0.1798}, size  = 160, state = false, tag = "crft"},
        {pos   = {-0.6575,0.1,-0.1798}, size  = 160, state = false, tag = "crft"},
        {pos   = {-0.604,0.1,-0.1798}, size  = 160, state = false, tag = "crft"},
        {pos   = {-0.5505,0.1,-0.1798}, size  = 160, state = false, tag = "crft"},
        {pos   = {-0.497,0.1,-0.1798}, size  = 160, state = false, tag = "crft"},
        --Drive
        {pos   = {-0.711,0.1,-0.0687}, size  = 160, state = false, tag = "drve"},
        {pos   = {-0.6575,0.1,-0.0687}, size  = 160, state = false, tag = "drve"},
        {pos   = {-0.604,0.1,-0.0687}, size  = 160, state = false, tag = "drve"},
        {pos   = {-0.5505,0.1,-0.0687}, size  = 160, state = false, tag = "drve"},
        {pos   = {-0.497,0.1,-0.0687}, size  = 160, state = false, tag = "drve"},
        --Firearms
        {pos   = {-0.711,0.1,0.0424}, size  = 160, state = false, tag = "fire"},
        {pos   = {-0.6575,0.1,0.0424}, size  = 160, state = false, tag = "fire"},
        {pos   = {-0.604,0.1,0.0424}, size  = 160, state = false, tag = "fire"},
        {pos   = {-0.5505,0.1,0.0424}, size  = 160, state = false, tag = "fire"},
        {pos   = {-0.497,0.1,0.0424}, size  = 160, state = false, tag = "fire"},
        --Larceny
        {pos   = {-0.711,0.1,0.1535}, size  = 160, state = false, tag = "larc"},
        {pos   = {-0.6575,0.1,0.1535}, size  = 160, state = false, tag = "larc"},
        {pos   = {-0.604,0.1,0.1535}, size  = 160, state = false, tag = "larc"},
        {pos   = {-0.5505,0.1,0.1535}, size  = 160, state = false, tag = "larc"},
        {pos   = {-0.497,0.1,0.1535}, size  = 160, state = false, tag = "larc"},
        --Melee
        {pos   = {-0.711,0.1,0.2646}, size  = 160, state = false, tag = "mele"},
        {pos   = {-0.6575,0.1,0.2646}, size  = 160, state = false, tag = "mele"},
        {pos   = {-0.604,0.1,0.2646}, size  = 160, state = false, tag = "mele"},
        {pos   = {-0.5505,0.1,0.2646}, size  = 160, state = false, tag = "mele"},
        {pos   = {-0.497,0.1,0.2646}, size  = 160, state = false, tag = "mele"},
        --Stealth
        {pos   = {-0.711,0.1,0.3757}, size  = 160, state = false, tag = "stea"},
        {pos   = {-0.6575,0.1,0.3757}, size  = 160, state = false, tag = "stea"},
        {pos   = {-0.604,0.1,0.3757}, size  = 160, state = false, tag = "stea"},
        {pos   = {-0.5505,0.1,0.3757}, size  = 160, state = false, tag = "stea"},
        {pos   = {-0.497,0.1,0.3757}, size  = 160, state = false, tag = "stea"},
        --Survival
        {pos   = {-0.711,0.1,0.4868}, size  = 160, state = false, tag = "surv"},
        {pos   = {-0.6575,0.1,0.4868}, size  = 160, state = false, tag = "surv"},
        {pos   = {-0.604,0.1,0.4868}, size  = 160, state = false, tag = "surv"},
        {pos   = {-0.5505,0.1,0.4868}, size  = 160, state = false, tag = "surv"},
        {pos   = {-0.497,0.1,0.4868}, size  = 160, state = false, tag = "surv"},

        --Animal Ken
        {pos   = {0.186,0.1,-0.402}, size  = 160, state = false, tag = "anim"},
        {pos   = {0.2395,0.1,-0.402}, size  = 160, state = false, tag = "anim"},
        {pos   = {0.293,0.1,-0.402}, size  = 160, state = false, tag = "anim"},
        {pos   = {0.3465,0.1,-0.402}, size  = 160, state = false, tag = "anim"},
        {pos   = {0.4,0.1,-0.402}, size  = 160, state = false, tag = "anim"},
        --Etiquette
        {pos   = {0.186,0.1,-0.2909}, size  = 160, state = false, tag = "etiq"},
        {pos   = {0.2395,0.1,-0.2909}, size  = 160, state = false, tag = "etiq"},
        {pos   = {0.293,0.1,-0.2909}, size  = 160, state = false, tag = "etiq"},
        {pos   = {0.3465,0.1,-0.2909}, size  = 160, state = false, tag = "etiq"},
        {pos   = {0.4,0.1,-0.2909}, size  = 160, state = false, tag = "etiq"},
        --Insight
        {pos   = {0.186,0.1,-0.1798}, size  = 160, state = false, tag = "insi"},
        {pos   = {0.2395,0.1,-0.1798}, size  = 160, state = false, tag = "insi"},
        {pos   = {0.293,0.1,-0.1798}, size  = 160, state = false, tag = "insi"},
        {pos   = {0.3465,0.1,-0.1798}, size  = 160, state = false, tag = "insi"},
        {pos   = {0.4,0.1,-0.1798}, size  = 160, state = false, tag = "insi"},
        --Intimidation
        {pos   = {0.186,0.1,-0.0687}, size  = 160, state = false, tag = "inti"},
        {pos   = {0.2395,0.1,-0.0687}, size  = 160, state = false, tag = "inti"},
        {pos   = {0.293,0.1,-0.0687}, size  = 160, state = false, tag = "inti"},
        {pos   = {0.3465,0.1,-0.0687}, size  = 160, state = false, tag = "inti"},
        {pos   = {0.4,0.1,-0.0687}, size  = 160,  state = false, tag = "inti"},
        --Leadership
        {pos   = {0.186,0.1,0.0424}, size  = 160, state = false, tag = "lead"},
        {pos   = {0.2395,0.1,0.0424}, size  = 160, state = false, tag = "lead"},
        {pos   = {0.293,0.1,0.0424}, size  = 160, state = false, tag = "lead"},
        {pos   = {0.3465,0.1,0.0424}, size  = 160, state = false, tag = "lead"},
        {pos   = {0.4,0.1,0.0424}, size  = 160, state = false, tag = "lead"},
        --Performance
        {pos   = {0.186,0.1,0.1535}, size  = 160, state = false, tag = "perf"},
        {pos   = {0.2395,0.1,0.1535}, size  = 160, state = false, tag = "perf"},
        {pos   = {0.293,0.1,0.1535}, size  = 160, state = false, tag = "perf"},
        {pos   = {0.3465,0.1,0.1535}, size  = 160, state = false, tag = "perf"},
        {pos   = {0.4,0.1,0.1535}, size  = 160, state = false, tag = "perf"},
        --Persuation
        {pos   = {0.186,0.1,0.2646}, size  = 160, state = false, tag = "pers"},
        {pos   = {0.2395,0.1,0.2646}, size  = 160, state = false, tag = "pers"},
        {pos   = {0.293,0.1,0.2646}, size  = 160, state = false, tag = "pers"},
        {pos   = {0.3465,0.1,0.2646}, size  = 160, state = false, tag = "pers"},
        {pos   = {0.4,0.1,0.2646}, size  = 160, state = false, tag = "pers"},
        --Streetwise
        {pos   = {0.186,0.1,0.3757}, size  = 160, state = false, tag = "strw"},
        {pos   = {0.2395,0.1,0.3757}, size  = 160, state = false, tag = "strw"},
        {pos   = {0.293,0.1,0.3757}, size  = 160, state = false, tag = "strw"},
        {pos   = {0.3465,0.1,0.3757}, size  = 160, state = false, tag = "strw"},
        {pos   = {0.4,0.1,0.3757}, size  = 160, state = false, tag = "strw"},
        --Subterfuge
        {pos   = {0.186,0.1,0.4868}, size  = 160, state = false, tag = "subt"},
        {pos   = {0.2395,0.1,0.4868}, size  = 160, state = false, tag = "subt"},
        {pos   = {0.293,0.1,0.4868}, size  = 160, state = false, tag = "subt"},
        {pos   = {0.3465,0.1,0.4868}, size  = 160, state = false, tag = "subt"},
        {pos   = {0.4,0.1,0.4868}, size  = 160, state = false, tag = "subt"},

        --Academics
        {pos   = {1.083,0.1,-0.402}, size  = 160, state = false, tag = "acad"},
        {pos   = {1.1365,0.1,-0.402}, size  = 160, state = false, tag = "acad"},
        {pos   = {1.19,0.1,-0.402}, size  = 160, state = false, tag = "acad"},
        {pos   = {1.2435,0.1,-0.402}, size  = 160, state = false, tag = "acad"},
        {pos   = {1.297,0.1,-0.402}, size  = 160, state = false, tag = "acad"},
        --Awareness
        {pos   = {1.083,0.1,-0.2909}, size  = 160, state = false, tag = "awar"},
        {pos   = {1.1365,0.1,-0.2909}, size  = 160, state = false, tag = "awar"},
        {pos   = {1.19,0.1,-0.2909}, size  = 160, state = false, tag = "awar"},
        {pos   = {1.2435,0.1,-0.2909}, size  = 160, state = false, tag = "awar"},
        {pos   = {1.297,0.1,-0.2909}, size  = 160, state = false, tag = "awar"},
        --Finance
        {pos   = {1.083,0.1,-0.1798}, size  = 160, state = false, tag = "fnce"},
        {pos   = {1.1365,0.1,-0.1798}, size  = 160, state = false, tag = "fnce"},
        {pos   = {1.19,0.1,-0.1798}, size  = 160, state = false, tag = "fnce"},
        {pos   = {1.2435,0.1,-0.1798}, size  = 160, state = false, tag = "fnce"},
        {pos   = {1.297,0.1,-0.1798}, size  = 160, state = false, tag = "fnce"},
        --Investigação
        {pos   = {1.083,0.1,-0.0687}, size  = 160, state = false, tag = "inve"},
        {pos   = {1.1365,0.1,-0.0687}, size  = 160, state = false, tag = "inve"},
        {pos   = {1.19,0.1,-0.0687}, size  = 160, state = false, tag = "inve"},
        {pos   = {1.2435,0.1,-0.0687}, size  = 160, state = false, tag = "inve"},
        {pos   = {1.297,0.1,-0.0687}, size  = 160, state = false, tag = "inve"},
        --Medicine
        {pos   = {1.083,0.1,0.0424}, size  = 160, state = false, tag = "medi"},
        {pos   = {1.1365,0.1,0.0424}, size  = 160, state = false, tag = "medi"},
        {pos   = {1.19,0.1,0.0424}, size  = 160, state = false, tag = "medi"},
        {pos   = {1.2435,0.1,0.0424}, size  = 160, state = false, tag = "medi"},
        {pos   = {1.297,0.1,0.0424}, size  = 160, state = false, tag = "medi"},
        --Occult
        {pos   = {1.083,0.1,0.1535}, size  = 160, state = false, tag = "occu"},
        {pos   = {1.1365,0.1,0.1535}, size  = 160, state = false, tag = "occu"},
        {pos   = {1.19,0.1,0.1535}, size  = 160, state = false, tag = "occu"},
        {pos   = {1.2435,0.1,0.1535}, size  = 160, state = false, tag = "occu"},
        {pos   = {1.297,0.1,0.1535}, size  = 160, state = false, tag = "occu"},
        --Politics
        {pos   = {1.083,0.1,0.2646}, size  = 160, state = false, tag = "poli"},
        {pos   = {1.1365,0.1,0.2646}, size  = 160, state = false, tag = "poli"},
        {pos   = {1.19,0.1,0.2646}, size  = 160, state = false, tag = "poli"},
        {pos   = {1.2435,0.1,0.2646}, size  = 160, state = false, tag = "poli"},
        {pos   = {1.297,0.1,0.2646}, size  = 160, state = false, tag = "poli"},
        --Science
        {pos   = {1.083,0.1,0.3757}, size  = 160, state = false, tag = "scie"},
        {pos   = {1.1365,0.1,0.3757}, size  = 160, state = false, tag = "scie"},
        {pos   = {1.19,0.1,0.3757}, size  = 160, state = false, tag = "scie"},
        {pos   = {1.2435,0.1,0.3757}, size  = 160, state = false, tag = "scie"},
        {pos   = {1.297,0.1,0.3757}, size  = 160, state = false, tag = "scie"},
        --Technology
        {pos   = {1.083,0.1,0.4868}, size  = 160, state = false, tag = "tech"},
        {pos   = {1.1365,0.1,0.4868}, size  = 160, state = false, tag = "tech"},
        {pos   = {1.19,0.1,0.4868}, size  = 160, state = false, tag = "tech"},
        {pos   = {1.2435,0.1,0.4868}, size  = 160, state = false, tag = "tech"},
        {pos   = {1.297,0.1,0.4868}, size  = 160, state = false, tag = "tech"},

        --Discipline 1
        {pos   = {-0.6995,0.1,0.698}, size  = 160, state = false, tag = "dis1"},
        {pos   = {-0.647,0.1,0.698}, size  = 160, state = false, tag = "dis1"},
        {pos   = {-0.5935,0.1,0.698}, size  = 160, state = false, tag = "dis1"},
        {pos   = {-0.54,0.1,0.698}, size  = 160, state = false, tag = "dis1"},
        {pos   = {-0.4865,0.1,0.698}, size  = 160, state = false, tag = "dis1"},
        --Discipline 2
        {pos   = {0.1865,0.1,0.698}, size  = 160, state = false, tag = "dis2"},
        {pos   = {0.24,0.1,0.698}, size  = 160, state = false, tag = "dis2"},
        {pos   = {0.2935,0.1,0.698}, size  = 160, state = false, tag = "dis2"},
        {pos   = {0.347,0.1,0.698}, size  = 160, state = false, tag = "dis2"},
        {pos   = {0.4005,0.1,0.698}, size  = 160, state = false, tag = "dis2"},
        --Discipline 3
        {pos   = {1.0665,0.1,0.698}, size  = 160, state = false, tag = "dis3"},
        {pos   = {1.12,0.1,0.698}, size  = 160, state = false, tag = "dis3"},
        {pos   = {1.1735,0.1,0.698}, size  = 160, state = false, tag = "dis3"},
        {pos   = {1.227,0.1,0.698}, size  = 160, state = false, tag = "dis3"},
        {pos   = {1.2805,0.1,0.698}, size  = 160, state = false, tag = "dis3"},
        --Discipline 4
        {pos   = {-0.6995,0.1,1.245}, size  = 160, state = false, tag = "dis4"},
        {pos   = {-0.647,0.1,1.245}, size  = 160, state = false, tag = "dis4"},
        {pos   = {-0.5935,0.1,1.245}, size  = 160, state = false, tag = "dis4"},
        {pos   = {-0.54,0.1,1.245}, size  = 160, state = false, tag = "dis4"},
        {pos   = {-0.4865,0.1,1.245}, size  = 160, state = false, tag = "dis4"},
        --Discipline 5
        {pos   = {0.1865,0.1,1.245}, size  = 160, state = false, tag = "dis5"},
        {pos   = {0.24,0.1,1.245}, size  = 160, state = false, tag = "dis5"},
        {pos   = {0.2935,0.1,1.245}, size  = 160, state = false, tag = "dis5"},
        {pos   = {0.347,0.1,1.245}, size  = 160, state = false, tag = "dis5"},
        {pos   = {0.4005,0.1,1.245}, size  = 160, state = false, tag = "dis5"},
        --Discipline 6
        {pos   = {1.0665,0.1,1.245}, size  = 160, state = false, tag = "dis6"},
        {pos   = {1.12,0.1,1.245}, size  = 160, state = false, tag = "dis6"},
        {pos   = {1.1735,0.1,1.245}, size  = 160, state = false, tag = "dis6"},
        {pos   = {1.227,0.1,1.245}, size  = 160, state = false, tag = "dis6"},
        {pos   = {1.2805,0.1,1.245}, size  = 160, state = false, tag = "dis6"},

        --Hunger
        {pos   = {-0.026,0.1,1.84}, size  = 200, state = false, tag = "hunger"},
        {pos   = {0.033,0.1,1.84}, size  = 200, state = false, tag = "hunger"},
        {pos   = {0.092,0.1,1.84}, size  = 200, state = false, tag = "hunger"},
        {pos   = {0.151,0.1,1.84}, size  = 200, state = false, tag = "hunger"},
        {pos   = {0.21,0.1,1.84}, size  = 200, state = false, tag = "hunger"},

        --Humanity
        {pos   = {0.729,0.1,1.84}, size  = 200, state = false, tag = "humanity"},
        {pos   = {0.788,0.1,1.84}, size  = 200, state = false, tag = "humanity"},
        {pos   = {0.847,0.1,1.84}, size  = 200, state = false, tag = "humanity"},
        {pos   = {0.906,0.1,1.84}, size  = 200, state = false, tag = "humanity"},
        {pos   = {0.965,0.1,1.84}, size  = 200, state = false, tag = "humanity"},

        {pos   = {1.046,0.1,1.84}, size  = 200, state = false, tag = "humanity"},
        {pos   = {1.105,0.1,1.84}, size  = 200, state = false, tag = "humanity"},
        {pos   = {1.164,0.1,1.84}, size  = 200, state = false, tag = "humanity"},
        {pos   = {1.223,0.1,1.84}, size  = 200, state = false, tag = "humanity"},
        {pos   = {1.282,0.1,1.84}, size  = 200, state = false, tag = "humanity"},


        --Play Mode
        {pos   = {1.5,0.1,2}, size  = 800, state = false, tag = "edit"},
        {pos   = {0,0,0}, size  = 0, state = false, tag = "dummy"},

        --End of checkboxes
    },

    --Add checkboxes for aggravated damage
    checkboxA = {
        --[[
        pos   = the position (pasted from the helper tool)
        size  = height/width/font_size for checkbox
        state = default starting value for checkbox (0-White, 1-Black, 2-Red)
        ]]

        --Health
        {pos   = {-0.6405,0.1,-0.647}, size  = 200, state = 0, tag = "health"},
        {pos   = {-0.5815,0.1,-0.647}, size  = 200, state = 0, tag = "health"},
        {pos   = {-0.5225,0.1,-0.647}, size  = 200, state = 0, tag = "health"},
        {pos   = {-0.4635,0.1,-0.647}, size  = 200, state = 0, tag = "health"},
        {pos   = {-0.4045,0.1,-0.647}, size  = 200, state = 0, tag = "health"},

        {pos   = {-0.324,0.1,-0.647}, size  = 200, state = 0, tag = "health"},
        {pos   = {-0.265,0.1,-0.647}, size  = 200, state = 0, tag = "health"},
        {pos   = {-0.206,0.1,-0.647}, size  = 200, state = 0, tag = "health"},
        {pos   = {-0.147,0.1,-0.647}, size  = 200, state = 0, tag = "health"},
        {pos   = {-0.088,0.1,-0.647}, size  = 200, state = 0, tag = "health"},

        --Willpower
        {pos   = {0.0765,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},
        {pos   = {0.1355,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},
        {pos   = {0.1945,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},
        {pos   = {0.2535,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},
        {pos   = {0.3125,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},

        {pos   = {0.393,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},
        {pos   = {0.452,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},
        {pos   = {0.511,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},
        {pos   = {0.570,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},
        {pos   = {0.629,0.1,-0.647}, size  = 200, state = 0, tag = "willpower"},

        --End of checkboxes for aggravated damage
    },

    --Add counters that have a + and - button
    counter = {
        --[[
        pos    = the position (pasted from the helper tool)
        size   = height/width/font_size for counter
        value  = default starting value for counter
        hideBG = if background of counter is hidden (true=hidden, false=not)
        ]]

        --End of counters
    },
    --Add editable text boxes
    textbox = {
        --[[
        pos       = the position (pasted from the helper tool)
        rows      = how many lines of text you want for this box
        width     = how wide the text box is
        font_size = size of text. This and "rows" effect overall height
        label     = what is shown when there is no text. "" = nothing
        value     = text entered into box. "" = nothing
        alignment = Number to indicate how you want text aligned
                    (1=Automatic, 2=Left, 3=Center, 4=Right, 5=Justified)
        ]]
        --Header
        {   pos       = {-0.77,0.1,-1.576},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.1,0.1,-1.576},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.97,0.1,-1.576},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.77,0.1,-1.456},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.1,0.1,-1.456},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.97,0.1,-1.456},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.77,0.1,-1.336},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.1,0.1,-1.336},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.97,0.1,-1.336},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},

        -- Resonance
        {   pos       = {-0.765,0.1,1.826},
            rows      = 1, width = 2800, font_size = 300,
            label     = "", value     = "", alignment = 2},


        -- Discipline 1
        {   pos       = {-1.01,0.1,0.7},
            rows      = 1, width = 2400, font_size = 300,
            label     = "", value     = "", alignment = 3},
        {   pos       = {-0.88,0.1,0.7917},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.88,0.1,0.8833},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.88,0.1,0.975},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.88,0.1,1.0667},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.88,0.1,1.1583},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},

        -- Discipline 2
        {   pos       = {-0.1,0.1,0.7},
            rows      = 1, width = 2400, font_size = 300,
            label     = "", value     = "", alignment = 3},
        {   pos       = {0.03,0.1,0.7917},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.03,0.1,0.8833},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.03,0.1,0.975},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.03,0.1,1.0667},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.03,0.1,1.1583},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},

        -- Discipline 3
        {   pos       = {0.75,0.1,0.7},
            rows      = 1, width = 2400, font_size = 300,
            label     = "", value     = "", alignment = 3},
        {   pos       = {0.88,0.1,0.7917},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.88,0.1,0.8833},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.88,0.1,0.975},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.88,0.1,1.0667},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.88,0.1,1.1583},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},

        -- Discipline 4
        {   pos       = {-1.01,0.1,1.25},
            rows      = 1, width = 2400, font_size = 300,
            label     = "", value     = "", alignment = 3},
        {   pos       = {-0.88,0.1,1.3417},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.88,0.1,1.4333},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.88,0.1,1.525},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.88,0.1,1.6167},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {-0.88,0.1,1.7083},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},

        -- Discipline 5
        {   pos       = {-0.1,0.1,1.25},
            rows      = 1, width = 2400, font_size = 250,
            label     = "", value     = "", alignment = 3},
        {   pos       = {0.03,0.1,1.3417},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.03,0.1,1.4333},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.03,0.1,1.525},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.03,0.1,1.6167},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.03,0.1,1.7083},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},

        -- Discipline 6
        {   pos       = {0.75,0.1,1.25},
            rows      = 1, width = 2400, font_size = 300,
            label     = "", value     = "", alignment = 3},
        {   pos       = {0.88,0.1,1.3417},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.88,0.1,1.4333},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.88,0.1,1.525},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.88,0.1,1.6167},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},
        {   pos       = {0.88,0.1,1.7083},
            rows      = 1, width = 3800, font_size = 250,
            label     = "", value     = "", alignment = 2},

        --End of textboxes
    }
}



--Lua beyond this point, I recommend doing something more fun with your life



--Save function
function updateSave()
    saved_data = JSON.encode(ref_buttonData)
    if disableSave==true then saved_data="" end
    self.script_state = saved_data
end

--Startup procedure
function onload(saved_data)
    if disableSave==true then saved_data="" end
    if saved_data ~= "" then
        local loaded_data = JSON.decode(saved_data)
        ref_buttonData = loaded_data
    else
        ref_buttonData = defaultButtonData
    end

    spawnedButtonCount = 0
    createCheckbox()
    createCheckboxA()
    createCounter()
    createTextbox()
    updateTrackers()
end

function tlength(T)
  local count = 0
  for _ in pairs(T) do count = count + 1 end
  return count
end


function updateTrackers()
if disableUpdateTrackers == false then
    local st = 0
    local co = 0
    local re = 0
    local len = tlength(ref_buttonData.checkbox)

    for i, data in ipairs(ref_buttonData.checkbox) do
        if data.tag == "sta" then
            if data.state == true then
                st = st + 1
            end
        end
        if data.tag == "com" then
            if data.state == true then
                co = co + 1
            end
        end
        if data.tag == "res" then
            if data.state == true then
                re = re + 1
            end
        end
    end

    for i, data in ipairs(ref_buttonData.checkboxA) do
        if data.tag == "health" then
            if i > (st + 3 + maxhealthmod) then
                data.state = 3
                self.editButton({index=len+i-1, color="Grey"})
            elseif data.state == 3 then
                data.state = 0
                self.editButton({index=len+i-1, color="White"})
            end
        elseif data.tag == "willpower" then
            if i > (10 + co + re + maxwillpowermod) then
                data.state = 3
                self.editButton({index=len+i-1, color="Grey"})
            elseif data.state == 3 then
                data.state = 0
                self.editButton({index=len+i-1, color="White"})
            end
        end
    end

end
end



--Click functions for buttons



--Checks or unchecks the given box (change colour)
function click_checkbox(tableIndex, buttonIndex)


if ref_buttonData.checkbox[tableIndex].tag == "edit" then
    if ref_buttonData.checkbox[tableIndex].state == true then
        ref_buttonData.checkbox[tableIndex].state = false
        self.editButton({index=buttonIndex, color="White"})
    else
        ref_buttonData.checkbox[tableIndex].state = true
        self.editButton({index=buttonIndex, color="Black"})
    end
else
for i, data in ipairs(ref_buttonData.checkbox) do
if data.tag == "edit" then
if data.state == false then
    if ref_buttonData.checkbox[tableIndex].state == true then
        if ref_buttonData.checkbox[tableIndex+1].tag == ref_buttonData.checkbox[tableIndex].tag then    
            if ref_buttonData.checkbox[tableIndex+1].state == true then
                for i, data in ipairs(ref_buttonData.checkbox) do
                    if data.tag == ref_buttonData.checkbox[tableIndex].tag then
                        if i > tableIndex then
                            ref_buttonData.checkbox[i].state = false
                            self.editButton({index=buttonIndex+i-tableIndex, color="White"})
                        end
                    end
                 end
             else
                ref_buttonData.checkbox[tableIndex].state = false
                self.editButton({index=buttonIndex, color="White"})
            end
        else
            ref_buttonData.checkbox[tableIndex].state = false
            self.editButton({index=buttonIndex, color="White"})
        end
    else
        for i, data in ipairs(ref_buttonData.checkbox) do
            if data.tag == ref_buttonData.checkbox[tableIndex].tag then
                if i <= tableIndex then
                    ref_buttonData.checkbox[i].state = true
                    self.editButton({index=buttonIndex+i-tableIndex, color="Black"})
                end
            end
        end
    end
    if ref_buttonData.checkbox[tableIndex].tag == "sta" then updateTrackers()
    elseif ref_buttonData.checkbox[tableIndex].tag == "com" then updateTrackers()
    elseif ref_buttonData.checkbox[tableIndex].tag == "res" then updateTrackers()
    end
elseif data.state == true then
        local dheight = 5
        for i, data in ipairs(ref_buttonData.checkbox) do
            if data.tag == ref_buttonData.checkbox[tableIndex].tag and data.state == true then
                local dice = spawnObject({type = "Custom_Dice", position = {0,dheight,0}})
                dice.setCustomObject({type = 3, image = "https://steamusercontent-a.akamaihd.net/ugc/957476100395980607/FBE78762303A5315D6FB0697D051C7B49D955054/"})
                dice.setName(ref_buttonData.checkbox[tableIndex].tag)
                dice.setLuaScript("local isRolling = false\nhighlightDuration = 30\n\nfunction onUpdate()\n    if not self.resting then \n        self.highlightOff()\n        isRolling = true\n    elseif isRolling and self.resting then\n        isRolling = false\n        local value = self.getValue()\n        if value == 1 then\n            self.highlightOn({0.856, 0.1, 0.094}, highlightDuration)\n        elseif value == 10 then\n            self.highlightOn({0.192, 0.701, 0.168}, highlightDuration)\n        elseif value >= 6 then \n            self.highlightOn({1, 1, 1}, highlightDuration) \n        else\n            self.highlightOff()\n        end\n    end\nend")
                dice.use_hands = true
                dheight = dheight + 1
            end
        end
end
end
end
end
    updateSave()
end

--Changes colour of checkbox to three different states (possibility of aggravated damage)
function click_checkboxA(tableIndex, buttonIndex)
    if ref_buttonData.checkboxA[tableIndex].state == 0 then
        ref_buttonData.checkboxA[tableIndex].state = 1
        self.editButton({index=buttonIndex, color="Black"})
    elseif ref_buttonData.checkboxA[tableIndex].state == 1 then
        ref_buttonData.checkboxA[tableIndex].state = 2
        self.editButton({index=buttonIndex, color="Red"})
    elseif ref_buttonData.checkboxA[tableIndex].state == 2 then
        ref_buttonData.checkboxA[tableIndex].state = 0
        self.editButton({index=buttonIndex, color="White"})
    end
    updateSave()
end

--Applies value to given counter display
function click_counter(tableIndex, buttonIndex, amount)
    ref_buttonData.counter[tableIndex].value = ref_buttonData.counter[tableIndex].value + amount
    self.editButton({index=buttonIndex, label=ref_buttonData.counter[tableIndex].value})
    updateSave()
end

--Updates saved value for given text box
function click_textbox(i, value, selected)
    if selected == false then
        ref_buttonData.textbox[i].value = value
        updateSave()
    end
end

--Dud function for if you have a background on a counter
function click_none() end



--Button creation



--Makes checkboxes
function createCheckbox()
    for i, data in ipairs(ref_buttonData.checkbox) do
        --Sets up reference function
        local buttonNumber = spawnedButtonCount
        local funcName = "checkbox"..i
        local func = function() click_checkbox(i, buttonNumber) end
        self.setVar(funcName, func)
        --Sets up label
        local label = ""
        local bc="White"
        if data.state==true then bc="Black" end
        --Creates button and counts it
        self.createButton({
            label=label, click_function=funcName, function_owner=self,
            position=data.pos, height=data.size, width=data.size,
            font_size=data.size, scale=buttonScale,
            color=bc, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1
    end
end

--Makes checkboxes for tracking superficial and aggravated damage
function createCheckboxA()
    for i, data in ipairs(ref_buttonData.checkboxA) do
        --Sets up reference function
        local buttonNumber = spawnedButtonCount
        local funcName = "checkboxA"..i
        local func = function() click_checkboxA(i, buttonNumber) end
        self.setVar(funcName, func)
        --Sets up label
        local label = ""
        local bc="White"
        if data.state==1 then bc="Black"
        elseif data.state==2 then bc="Red" end
        --Creates button and counts it
        self.createButton({
            label=label, click_function=funcName, function_owner=self,
            position=data.pos, height=data.size, width=data.size,
            font_size=data.size, scale=buttonScale,
            color=bc, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1
    end
end

--Makes counters
function createCounter()
    for i, data in ipairs(ref_buttonData.counter) do
        --Sets up display
        local displayNumber = spawnedButtonCount
        --Sets up label
        local label = data.value
        --Sets height/width for display
        local size = data.size
        if data.hideBG == true then size = 0 end
        --Creates button and counts it
        self.createButton({
            label=label, click_function="click_none", function_owner=self,
            position=data.pos, height=size, width=size,
            font_size=data.size, scale=buttonScale,
            color=buttonColor, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1

        --Sets up add 1
        local funcName = "counterAdd"..i
        local func = function() click_counter(i, displayNumber, 1) end
        self.setVar(funcName, func)
        --Sets up label
        local label = "+"
        --Sets up position
        local offsetDistance = (data.size/2 + data.size/4) * (buttonScale[1] * 0.002)
        local pos = {data.pos[1] + offsetDistance, data.pos[2], data.pos[3]}
        --Sets up size
        local size = data.size / 2
        --Creates button and counts it
        self.createButton({
            label=label, click_function=funcName, function_owner=self,
            position=pos, height=size, width=size,
            font_size=size, scale=buttonScale,
            color=buttonColor, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1

        --Sets up subtract 1
        local funcName = "counterSub"..i
        local func = function() click_counter(i, displayNumber, -1) end
        self.setVar(funcName, func)
        --Sets up label
        local label = "-"
        --Set up position
        local pos = {data.pos[1] - offsetDistance, data.pos[2], data.pos[3]}
        --Creates button and counts it
        self.createButton({
            label=label, click_function=funcName, function_owner=self,
            position=pos, height=size, width=size,
            font_size=size, scale=buttonScale,
            color=buttonColor, font_color=buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1
    end
end

function createTextbox()
    for i, data in ipairs(ref_buttonData.textbox) do
        --Sets up reference function
        local funcName = "textbox"..i
        local func = function(_,_,val,sel) click_textbox(i,val,sel) end
        self.setVar(funcName, func)

        self.createInput({
            input_function = funcName,
            function_owner = self,
            label          = data.label,
            alignment      = data.alignment,
            position       = data.pos,
            scale          = buttonScale,
            width          = data.width,
            height         = (data.font_size*data.rows)+24,
            font_size      = data.font_size,
            color          = buttonColor,
            font_color     = buttonFontColor,
            value          = data.value,
        })
    end
end