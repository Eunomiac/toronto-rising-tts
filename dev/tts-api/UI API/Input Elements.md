## Table of Contents

* Targeting Triggers
* Element Summary
* Element Details
  * InputField
  * Button
  * Toggle
  * ToggleButton
  * ToggleGroup
  * Slider
  * Dropdown

# Input Elements

All input elements allow for the XML UI to interact with the Lua scripts in the game instance.
> **Tip: Tip**
> Be sure to check out the [UI section of the Lua Scripting API](../)for how to receive the input from these element types. With Lua scripting, you can even modify the UI elements!
>
## Targeting Triggers {#targeting-triggers}

When using an attribute that triggers scripting, like onValueChanged or onClick, the UI will target a default location. Global UI targets Global script, Object UI targets the Object's script. This behavior can be overwritten. For example:

```lua
<Button onClick="uiClickFunc">Click Me</Button>
```

If this was in the Global UI, this would trigger a function in the Global Lua script `function uiClickFunc()`. But if you want to target a function on an Object's script? Place the GUID for the object before the function name, like so:

```lua
<Button onClick="aaa111/uiClickFunc">Click Me</Button>
```

Now when the button is clicked, it will still try to activate `function uiClickFunc()` but it will try to do so on the Object Lua script of the Object with the GUID of "aaa111".

```lua
<Button onClick="Global/uiClickFunc">Click Me</Button>
```

And if this was in an Object's UI, it would direct the function activation to Global instead of that Object.
Remember you can also use the [Id attribute](../attributes/#general-attributes)to identify which UI element triggered the function.

## Element Summary {#element-summary}

|Element Name|Description| |
|---|---|---|
|`<InputField></InputField>`|A text input for single or multiple lines. Is able to send the text (during edit and when finished).|[#inputfield](#inputfield)|
|`<Button></Button>`|A button. Is able to send a trigger event.|[#button](#button)|
|`<Toggle></Toggle>`|A simple on/off toggle. Is able to send on/off status.|[#toggle](#toggle)|
|`<ToggleButton></ToggleButton>`|A toggle, but styled as a button.|[#togglebutton](#togglebutton)|
|`<ToggleGroup></ToggleGroup>`|Allows a group of toggles to act as a radio button, where only 1 of them can be "checked" at once.|[#togglegroup](#togglegroup)|
|`<Slider></Slider>`|A value slider. Is able to send Value.|[#slider](#slider)|
|`<Dropdown></Dropdown>`|A dropdown menu. Is able to send the contents of the selection made in it.|[#dropdown](#dropdown)|

---

## Element Details {#element-details}

### InputField {#inputfield}

A text input for single or multiple lines. Is able to send the text (during edit and when finished).

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|onValueChanged|Each time the text is changed, a Lua function with this name will be triggered.|string|(none)|
|onEndEdit|When the input box is deselected, a Lua function with this name will be triggered.|string|(none)|
|text|The string in the text box, if any. Is the value sent to onValueChanged's or onEndEdit's function.|string|(none)|
|placeholder|A string that is semi-visible when there is no text in the input.|string|(none)|
|interactable| |` boolean `|` true `|
|colors| |` colorblock `|`#FFFFFF\|#FFFFFF\|#C8C8C8\|rgba(0.78,0.78,0.78,0.5)`|
|lineType| |SingleLine MultiLineSubmit MultiLineNewLine|` SingleLine `|
|characterValidation| |None Integer Decimal Alphanumeric Name EmailAddress|` None `|
|caretBlinkRate| |float|`0.85`|
|caretWidth| |float|`1`|
|caretColor| |` color `|`#323232`|
|selectionColor| |` color `|`rgba(0.65,0.8,1,0.75)`|
|readOnly| |` boolean `|false|
|textColor| |` color `|`#323232`|
|characterLimit| |int|`0` (no limit)|

> **Note: Note**
> The text typed into an XML input field can't be obtained outside of the automatically passed arguments to ` onValueChanged `/ ` onEndEdit `.
> **Example: Example**
>
> ```lua
> <InputField onEndEdit="onEndEdit" >Default Text</InputField>
> ```
>
> ```lua
> function onEndEdit(player, value, id)
> print(player.steam_name.. " entered: ".. value)
> -- store the value in a global variable for later access
> enteredValue = value
> end
> ```
>
> ```lua
> <InputField onEndEdit="onEndEdit" >Default Text</InputField>
> ```
>
> ```lua
> function onEndEdit(player, value, id)
> print(player.steam_name.. " entered: ".. value)
> -- store the value in a global variable for later access
> enteredValue = value
> end
> ```

---

### Button {#button}

A button. Is able to send a trigger event.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|onClick|When clicked, a Lua function with this name will be triggered.|string|(none)|
|interactable| |` boolean `|` true `|
|colors| |` colorblock `|`#FFFFFF\|#FFFFFF\|#C8C8C8\|rgba(0.78,0.78,0.78,0.5)`|
|textShadow| |` color `|(none)|
|textOutline| |` color `|(none)|
|textAlignment| |UpperLeft UpperCenter UpperRight MiddleLeft MiddleCenter MiddleRight LowerLeft LowerCenter LowerRight|` UpperLeft `|
|icon| |string|(none)|
|iconWidth| |float| |
|iconColor| |` color `| |
|iconAlignment| |Left Right|` Left `|
|padding| |float float float float|`0 0 0 0`|
|transition| |None ColorTint SpriteSwap Animation|` ColorTint `|
|highlightedSprite| |string| |
|pressedSprite| |string| |
|disabledSprite| |string| |

> **Example: Example**
>
> ```lua
> <!-- Standard Button -->
> <Button>Button Text</Button>
> <!-- Button with Icon -->
> <Button icon="SomeName" />
> <!-- Button with Icon and Text -->
> <Button icon="SomeName">Button With Icon</Button>
> ```
>
> **Tip: Tip**
> onClick passes nil for the value by default. However, you can assign a string that will be passed in onClick.
>
> ```lua
> <Button onClick="clickFunction(stringName)" />
> ```
>
> The above example passes a string with the name of `"stringName"` to the Lua function for the value property.

---

### Toggle {#toggle}

A simple on/off toggle. Is able to send on/off status.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|onValueChanged|When toggled, a Lua function with this name will be triggered.|string|(none)|
|interactable| |` boolean `|` true `|
|textColor| |` color `|`#000000`|
|colors| |` colorblock `|`#FFFFFF\|#FFFFFF\|#C8C8C8\|rgba(0.78,0.78,0.78,0.5)`|
|isOn|If the toggle is "on" or not. Is the value sent to onValueChanged's function.|` boolean `|false|
|toggleWidth|Sets the width in pixels of the internal check box|float|20|
|toggleHeight|Sets the width in pixels of the internal check box|float|20|

> **Example: Example**
>
> ```lua
> <Toggle>Toggle Text</Toggle>
> <!-- Toggle which is selected by default -->
> <Toggle isOn="true">Toggle Text</Toggle>
> ```

---

### ToggleButton {#togglebutton}

A toggle, but styled as a button.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|onValueChanged|When toggled, a Lua function with this name will be triggered.|string|(none)|
|interactable| |` boolean `|` true `|
|textColor| |` color `|`#000000`|
|colors| |` colorblock `|`#FFFFFF\|#FFFFFF\|#C8C8C8\|rgba(0.78,0.78,0.78,0.5)`|
|isOn|If the toggle is "on" or not. Is the value sent to onValueChanged's function.|` boolean `|false|
|textShadow| |` color `|(none)|
|textOutline| |` color `|(none)|
|textAlignment| |UpperLeft UpperCenter UpperRight MiddleLeft MiddleCenter MiddleRight LowerLeft LowerCenter LowerRight|` UpperLeft `|
|icon| |string|(none)|
|iconWidth| |float| |
|iconColor| |` color `| |
|iconAlignment| |Left Right|` Left `|
|padding| |float float float float|`0 0 0 0`|

> **Example: Example**
>
> ```lua
> <ToggleButton>Toggle Button Text</Toggle>
> ```

---

### ToggleGroup {#togglegroup}

Allows a group of toggles to act as a radio button, where only 1 of them can be "checked" at once (works with Toggle or ToggleButton).

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|allowSwitchOff|If this is set to true, then the user may clear their selection from within the ToggleGroup by clicking on the selected Toggle.|` boolean `|` false `|
|toggleBackgroundImage|Sets the default background image to use for nested Toggle elements.|string| |
|toggleBackgroundColor| |` color `|`#FFFFFF`|
|toggleSelectedImage|Sets the default image to use for selected (checked) nested Toggle elements.|string| |
|toggleSelectedColor| |` color `|`#FFFFFF`|

> **Example: Example**
>
> ```lua
> <ToggleGroup>
> <VerticalLayout>
> <Toggle>Toggle A</Toggle>
> <Toggle>Toggle B</Toggle>
> <Toggle>Toggle C</Toggle>
> </VerticalLayout>
> </ToggleGroup>
> <ToggleGroup>
> <HorizontalLayout>
> <ToggleButton>ToggleButton A</ToggleButton>
> <ToggleButton>ToggleButton B</ToggleButton>
> <ToggleButton>ToggleButton C</ToggleButton>
> </HorizontalLayout>
> </ToggleGroup>
> ```

---

### Slider {#slider}

A value slider. Is able to send Value.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|onValueChanged|When the slider is moved, a Lua function with this name will be triggered. (rapidly)|string|(none)|
|interactable| |` boolean `|` true `|
|colors| |` colorblock `|`#FFFFFF\|#FFFFFF\|#C8C8C8\|rgba(0.78,0.78,0.78,0.5)`|
|minValue| |float|`0`|
|maxValue| |float|`1`|
|value|The value currently selected. Is the value sent to onValueChanged's function.|float|`0`|
|wholeNumbers| |` boolean `|false|
|direction| |LeftToRight RightToLeft TopToBottom BottomToTop|` LeftToRight `|
|backgroundColor| |` color `|(none)|
|fillColor| |` color `|(none)|
|fillImage| |string| |
|handleColor| |` color `|(none)|
|handleImage| |string| |

> **Example: Example**
>
> ```lua
> <Slider minValue="0" maxValue="1" value="0.5" />
> ```

---

### Dropdown {#dropdown}

A dropdown menu. Is able to send the contents (or the index of the item in the list) of the selection made in it.

|Attribute Name|Description|Type / Options|Default Value|
|---|---|---|---|
|onValueChanged|When an option is selected, a Lua function with this name will be triggered.|string|(none)|
|interactable| |` boolean `|` true `|
|textColor| |` color `|`#000000`|
|itemBackgroundColors| |` colorblock `|#FFFFFF|
|itemTextColor| |` color `|`#000000`|
|checkColor|Color of the checkmark next to the selected item.|` color `|`#000000`|
|checkImage| |string| |
|arrowColor| |` color `|`#000000`|
|arrowImage| |string| |
|dropdownBackgroundColor| |` color `|`#000000`|
|dropdownBackgroundImage| |string| |
|dropdownHeight|Height of the dropdown list.|float| |
|scrollbarColors| |` colorblock `| |
|scrollbarImage| |string| |
|itemHeight|Height of the items in the dropdown list.|float| |

> **Tip: Tip**
> It's likely that you will need to adjust the ` scrollSensitivity ` for large dropdown menus.
> **Example: Example**
>
> ```lua
> <Dropdown id="Selection" onValueChanged="optionSelected">
> <Option selected="true">Option 1</Option>
> <Option>Option 2</Option>
> <Option>Option 3</Option>
> <Option>Option 4</Option>
> </Dropdown>
> ```
>
> ```lua
> function optionSelected(player, selectedValue, id)
> print(player.steam_name.. " selected: ".. selectedValue)
> end
> ```
>
> ```lua
> <Dropdown id="Selection" onValueChanged="optionSelected">
> <Option selected="true">Option 1</Option>
> <Option>Option 2</Option>
> <Option>Option 3</Option>
> <Option>Option 4</Option>
> </Dropdown>
> ```
>
> ```lua
> function optionSelected(player, selectedValue, id)
> print(player.steam_name.. " selected: ".. selectedValue)
> end
> ```
>
> **Tip: Tip**
> Append `(selectedIndex)` to the function name to pass the index (0-indexed) of the selected option as second parameter. Note that this is passed as string, so you might want to turn it into a number for indexing a list.
> To make sure that the dropdown selection is consistent across clients and edits with scripting, set the ` value ` attribute to the index (see the following example).
> **Example: Example**
>
> ```lua
> <Dropdown id="Selection" onValueChanged="optionSelected(selectedIndex)">
> <Option selected="true">Option 1</Option>
> <Option>Option 2</Option>
> <Option>Option 3</Option>
> <Option>Option 4</Option>
> </Dropdown>
> ```
>
> ```lua
> function optionSelected(player, selectedIndex, id)
> -- convert string to number
> selectedIndex = tonumber(selectedIndex)
> -- set dropdown value to item index
> UI.setAttribute(id, "value", selectedIndex)
> -- example print
> print(player.steam_name.. " selected option with index: ".. selectedIndex)
> end
> ```
>
> ```lua
> <Dropdown id="Selection" onValueChanged="optionSelected(selectedIndex)">
> <Option selected="true">Option 1</Option>
> <Option>Option 2</Option>
> <Option>Option 3</Option>
> <Option>Option 4</Option>
> </Dropdown>
> ```
>
> ```lua
> function optionSelected(player, selectedIndex, id)
> -- convert string to number
> selectedIndex = tonumber(selectedIndex)
> -- set dropdown value to item index
> UI.setAttribute(id, "value", selectedIndex)
> -- example print
> print(player.steam_name.. " selected option with index: ".. selectedIndex)
> end
> ```

---
