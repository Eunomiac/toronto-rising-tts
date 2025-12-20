## Table of Contents

* Element Summary
* Element Details
  * Text
  * Image
  * ProgressBar

# Basic Elements

These are display-type elements for the UI. They cannot send information to any Lua scripts.
Each element has its own attributes specific to its type that work in addition to the [common attributes](../attributes/#common-attributes).

## Element Summary {#element-summary}

|Element Name|Description| |
|---|---|---|
|`<Text></Text>`|Adds basic text.|[#text](#text)|
|`<Image></Image>`|Adds an image.|[#image](#image)|
|`<ProgressBar></ProgressBar>`|Displays a progress bar which can be updated dynamically via script.|[#progressbar](#progressbar)|

## Element Details {#element-details}

### Text {#text}

Adds basic text. This tag supports Rich Text as shown in the example below.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|text|This can be used to determine the text that appears. It can also be modified externally by the script.|string|(none)|
|alignment| |UpperLeft UpperCenter UpperRight MiddleLeft MiddleCenter MiddleRight LowerLeft LowerCenter LowerRight|MiddleCenter|
|color| |` color `|`#323232`|
|fontStyle| |Normal Bold Italic BoldItalic|` Normal `|
|fontSize| |float|`14`|
|resizeTextForBestFit|Resize text to fit?|` boolean `|` false `|
|resizeTextMinSize|Minimum font size|float|`10`|
|resizeTextMaxSize|Maximum font size|float|`40`|
|horizontalOverflow| |Wrap Overflow|` Overflow `|
|verticalOverflow| |Truncate Overflow|` Truncate `|

> **Example: Example**
>
> ```lua
> <!-- Standard Text element -->
> <Text>Some Text</Text>
> <!-- Rich Text -->
> <Text>
> This text is <b>Bold</b>, <i>Italic</i>,
> and <textcolor color="#00FF00">Green</textcolor>.
> This text is <textsize size="18">Larger</textsize>.
> </Text>
> ```

---

### Image {#image}

Adds an image.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|image|The name of the file in the asset manager (upper right corner of the scripting window in-game).|string|(none)|
|color| |` color `|`#FFFFFF`|
|type|Image Type|Simple Sliced Filled Tiled|` Simple `|
|raycastTarget|Should this image block clicks from passing through it?|` boolean `|` true `|

---

### ProgressBar {#progressbar}

Displays a progress bar which can be updated dynamically via script.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|image|Background Image|(path to image)|(none)|
|color|Background Color|` color `|`#FFFFFF`|
|fillImage|Fill Image|string|(none)|
|fillImageColor|Fill Color|` color `|`#FFFFFF`|
|percentage|Percentage to Display|float|`0`|
|showPercentageText|Is the percentage text displayed?|` boolean `|` true `|
|percentageTextFormat|Format to use for the percentage text|string|`0.00`|
|textColor|Percentage Text Color|` color `|`#000000`|
|textShadow|Percentage Text Shadow Color|` color `|(none)|
|textOutline|Percentage Text Outline Color|` color `|(none)|
|textAlignment|Percentage Text Alignment|UpperLeft UpperCenter UpperRight MiddleLeft MiddleCenter MiddleRight LowerLeft LowerCenter LowerRight|`MiddleCenter`|

---
