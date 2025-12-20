## Table of Contents

* Member Variables
* Function Summary
* Function Details
  * clearHighlight()
  * getPage(...)
  * setHighlight(...)
  * setPage(...)

# Book

The Book behavior is present on Custom PDF Objects. The Book behaviour allows you to manipulate the displayed PDF.

## Member Variables {#member-variables}

|Variable|Type|Description|
|---|---|---|
|page_offset|`int`|The page numbers displayed in the Custom PDF UI are offset by this amount.|

> **Info: Info**
> For example, if ` page_offset ` were set to 10, the first page in the UI would be 11, rather than 1. Negative numbers are accepted, and useful if a rule book contains a front cover, index etc. within the PDF file.
>
## Function Summary {#function-summary}

|Function Name|Return|Description| |
|---|---|---|---|
|clearHighlight()|return ` boolean `|Clears the current highlight.| |
|getPage( ` boolean ` offsetPageNumbering)|return ` int `|Gets the current page of the PDF.|[#getpage](#getpage)|
|setHighlight( ` float ` x1, ` float ` y1, ` float ` x2, ` float ` y2)|return ` boolean `|Set highlight box on current page.|[#sethighlight](#sethighlight)|
|setPage( ` int ` page, ` boolean ` offsetPageNumbering)|return ` boolean `|Set current page.|[#setpage](#setpage)|

## Function Details {#function-details}

### getPage(...) {#getpage}

[../../types/](../../types/)Gets the current page of the PDF.
> **Info: getPage(offsetPageNumbering)**
>
> * [../../types/](../../types/) **offsetPageNumbering**: Indicates whether or not [page_offset](#page_offset)should be applied to the page number returned.
>
> * Optional, defaults to ` false `.
> * Optional, defaults to ` false `.

---

### setHighlight(...) {#sethighlight}

[../../types/](../../types/)Draws a highlight rectangle on the popout mode of the PDF at the given coordinates. Coordinates (0,0) are the lower left corner of the PDF, while coordinates (1,1) are the upper right corner.
> **Info: setHighlight(x1, y1, x2, y2)**
>
> * [../../types/](../../types/) **x1**: x coordinate of the rectangle's left side.
> * [../../types/](../../types/) **y1**: y coordinate of the rectangle's bottom side.
> * [../../types/](../../types/) **x2**: x coordinate of the rectangle's right side.
> * [../../types/](../../types/) **y2**: y coordinate of the rectangle's top side.
> **Example: Example**
> Highlight the upper right quarter of a PDF.
>
> ```lua
> object.Book.setHighlight(0.5, 0.5, 1, 1)
> ```
>
> ```lua
> object.Book.setHighlight(0.5, 0.5, 1, 1)
> ```

---

### setPage(...) {#setpage}

[../../types/](../../types/)Sets the current page of the PDF. Returns true if the page was succesfully set, false if the page number was invalid.
> **Info: setPage(page, offsetPageNumbering)**
>
> * [../../types/](../../types/) **page**: The new page number.
> * [../../types/](../../types/) **offsetPageNumbering**: Indicates whether or not [page_offset](#page_offset)should be applied to the page number set.
>
> * Optional, defaults to ` false `.
> * Optional, defaults to `false`.
