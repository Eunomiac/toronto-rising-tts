## Table of Contents

* Function Summary
  * Notebook Functions
  * Notes Functions
* Function Details
  * Notebook Function Details
    * addNotebookTab(...)
    * editNotebookTab(...)
    * getNotebookTabs()
    * removeNotebookTab(...)
  * Notes Function Details
    * getNotes()
    * setNotes(...)

# Notes

Notes, a static global class, allows access to the on-screen notes and the notebook.
Example function call: `Notes.setNotes()`

## Function Summary {#function-summary}

### Notebook Functions {#notebook-functions}

Functions that interact with the in-game notebook tabs.

|Function Name|Description|Return| |
|---|---|---|---|
|addNotebookTab( ` table ` parameters)|Adds a notebook tab, returning its index.|return ` int `|[#addnotebooktab](#addnotebooktab)|
|editNotebookTab( ` table ` parameters)|Edit an existing Tab in the notebook.|return ` boolean `|[#editnotebooktab](#editnotebooktab)|
|getNotebookTabs()|Returns Table containing data on all tabs in the notebook.|return ` table `|[#getnotebooktabs](#getnotebooktabs)|
|removeNotebookTab( ` int ` index)|Remove a notebook tab.|return ` boolean `|[#removenotebooktab](#removenotebooktab)|

### Notes Functions {#notes-functions}

Functions that interact with the on-screen notes (lower right corner of screen).

|Function Name|Description|Return| |
|---|---|---|---|
|getNotes()|Returns the contents of the on-screen notes section.|return ` string `| |
|setNotes( ` string ` notes)|Replace the text in the notes window with the string.|return ` boolean `|[#setnotes](#setnotes)|

## Function Details {#function-details}

### Notebook Function Details {#notebook-function-details}

#### addNotebookTab(...) {#addnotebooktab}

[../types/](../types/)Add a new notebook tab. If it failed to create a new tab, a -1 is returned instead. Indexes for notebook tabs begin at 0.
> **Info: addNotebookTab(parameters)**
>
> * [../types/](../types/) **parameters**: A Table containing spawning parameters.
>
> * [../types/](../types/) **parameters.title**: Title for the new tab.
> * [../types/](../types/) **parameters.body**: Text to place into the body of the new tab.
>
> * Optional, defaults to an empty string
> * [../types/](../types/) **parameters.color**: [Player Color](../player/instance/)for the new tab's color.
>
> * Optional, defaults to "Grey"
> * [../types/](../types/) **parameters.title**: Title for the new tab.
> * [../types/](../types/) **parameters.body**: Text to place into the body of the new tab.
>
> * Optional, defaults to an empty string
> * [../types/](../types/) **parameters.color**: [Player Color](../player/instance/)for the new tab's color.
>
> * Optional, defaults to "Grey"
> * Optional, defaults to an empty string
> * Optional, defaults to "Grey"
>
```lua
parameters = {
 title = "New Tab",
 body = "Body text example.",
 color = "Grey"
}
Notes.addNotebookTab(parameters)
```

---

#### editNotebookTab(...) {#editnotebooktab}

[../types/](../types/)Edit an existing Tab in the notebook. Indexes for notebook tabs begin at 0.
> **Info: editNotebookTab(parameters)**
>
> * [../types/](../types/) **parameters**: A Table containing instructions for the notebook edit.
>
> * [../types/](../types/) **parameters.index**: Index number for the tab.
> * [../types/](../types/) **parameters.title**: Title for the tab.
>
> * Optional, defaults to the current title of the tab begin edited.
> * [../types/](../types/) **parameters.body**: Text for the body for the tab.
>
> * Optional, defaults to the current body of the tab begin edited.
> * [../types/](../types/) **parameters.color**: [Player Color](../player/colors/)for who the tab belongs to.
>
> * Optional, defaults to the current color of the tab begin edited.
> * [../types/](../types/) **parameters.index**: Index number for the tab.
> * [../types/](../types/) **parameters.title**: Title for the tab.
>
> * Optional, defaults to the current title of the tab begin edited.
> * [../types/](../types/) **parameters.body**: Text for the body for the tab.
>
> * Optional, defaults to the current body of the tab begin edited.
> * [../types/](../types/) **parameters.color**: [Player Color](../player/colors/)for who the tab belongs to.
>
> * Optional, defaults to the current color of the tab begin edited.
> * Optional, defaults to the current title of the tab begin edited.
> * Optional, defaults to the current body of the tab begin edited.
> * Optional, defaults to the current color of the tab begin edited.
>
```lua
params = {
 index = 5,
 title = "Edited Title",
 body = "This tab was edited via script.",
 color = "Grey"
}
Notes.editNotebookTab(params)
```

---

#### getNotebookTabs() {#getnotebooktabs}

[../types/](../types/)Returns a Table containing data on all tabs in the notebook. Indexes for notebook tabs begin at 0.

```lua
--Example Usage
tabInfo = Notes.getNotebookTabs()
```

```lua
--Example Returned Table
{
 {index=0, title="", body="", color="Grey"},
 {index=1, title="", body="", color="Grey"},
 {index=2, title="", body="", color="Grey"},
}
```

---

#### removeNotebookTab(...) {#removenotebooktab}

[../types/](../types/)Remove a notebook tab. Notebook tab indexes begin at 0.
> **Info: removeNotebookTab(index)**
>
> * [../types/](../types/) **index**: Index for the tab to remove.
>
```lua
Notes.removeNotebookTab(0)
```

---

### Notes Function Details {#notes-function-details}

#### setNotes(...) {#setnotes}

[../types/](../types/)Replace the text in the notes window with the string. The notes is an area which displays text in the lower-right corner of the screen.
> **Info: setNotes(notes)**
>
> * [../types/](../types/) **notes**: What to place into the notes area.
>
```lua
Notes.setNotes("This appears in the notes section")
```

---
