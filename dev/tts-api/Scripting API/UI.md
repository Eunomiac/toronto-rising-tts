## Table of Contents

* Global and Object
* Inputs
* Member Variable Summary
* Function Summary
* Function Details
  * getAttribute(...)
  * getAttributes(...)
  * getCustomAssets()
  * getValue(...)
  * getXml()
  * getXmlTable()
  * hide(...)
  * setAttribute(...)
  * setAttributes(...)
  * setClass(...)
  * setCustomAssets(...)
  * setValue(...)
  * setXml(...)
  * setXmlTable(...)
  * show(...)

# UI

UI, a static global class AND an Object class. It is the method to interact with custom UI elements. It allows you to read/write attributes of elements defined in the XML of the UI. It also allows you to receive information from various inputs (like buttons) on-screen and on objects.
> **Note: Attention**
> This class allows for the **manipulation**of UI **at runtime**. It does **NOT**modify or fetch **the original XML**in the editor, but rather what is displayed as it continues to run during a game. Just like with Lua, you can only get/set dynamic values during runtime. You can use [onSave](../events/#onsave)and [onLoad](../events/#onload)to record any data you want to persist through save/load/undo.
> For more information on how to build UI elements within XML, view the [UI API](introUI/).
>
## Global and Object {#global-and-object}

UI can either be placed on the screen by using the **Global UI**or placed on an Object using **Object UI**. Depending on which you are using, these commands are used differently.
`Example of calling a function targeted at the Global UI: UI.getAttributes(id) Example of calling a function targeted at an Object UI: object.UI.getAttributes(id)`

## Inputs {#inputs}

[Input Elements](inputelements/)are able to trigger a function. By default, Global UI will trigger a function in Global and Object UI will trigger a function in the Object's script. To change the target script for an input, [view more details here](inputelements/#targeting-triggers).
When creating the input element in XML, you will select the name of the function it activates. Regardless of its name, it always will pass parameters
> **Info: functionName(player, value, id)**
>
> * [../types/](../types/) **player**: A direct Player reference to the person that triggered the input.
> * [../types/](../types/) **value**: The value sent by the input. A numeric value or a string, generally.
>
> * This is not used by buttons!
> * [../types/](../types/) **id**:
>
> * This is only passed if the element was given an Id attribute in the XML.
> * This is not used by buttons!
> * This is only passed if the element was given an Id attribute in the XML.
>
```lua
function onButtonClick(player, value, id)
 print(player.steam_name)
 print(id)
end
```

## Member Variable Summary {#member-variable-summary}

|Variable|Description|Type|
|---|---|---|
|loading|Indicates whether (the server) has finished loading all UI custom assets.|` boolean `|

---

## Function Summary {#function-summary}

|Function Name|Description|Return| |
|---|---|---|---|
|getAttribute( ` string ` id, ` string ` attribute)|Obtains the value of a specified attribute of a UI element.|return ` variable `|[#getattribute](#getattribute)|
|getAttributes( ` string ` id)|Returns the attributes and their values of a UI element.|return ` table `|[#getattributes](#getattributes)|
|getCustomAssets()|Returns a table/array of [custom assets](#setcustomassets-custom-assets).|return ` table `|[#getcustomassets](#getcustomassets)|
|getValue( ` string ` id)|Obtains the value between elements tags, like: `<Text>ValueToGet</Text>`|return ` string `|[#getvalue](#getvalue)|
|getXml()|Returns the contents of the current UI formatted as XML.|return ` string `| |
|getXmlTable()|Returns the contents of the current UI formatted as a table.|return ` table `|[#getxmltable](#getxmltable)|
|hide( ` string ` id)|Hides the given UI element. Unlike the "active" attribute, hide triggers animations.|return ` boolean `|[#hide](#hide)|
|setAttribute( ` string ` id, ` string ` attribute, ` variable ` value)|Sets the value of a specified attribute of a UI element.|return ` boolean `|[#setattribute](#setattribute)|
|setAttributes( ` string ` id, ` table ` data)|Updates the value of the supplied attributes of a UI element.|return ` boolean `|[#setattributes](#setattributes)|
|setClass( ` string ` id, ` string ` names)|Replaces all classes on a UI element.|return ` boolean `|[#setclass](#setclass)|
|setCustomAssets( ` table ` assets)|Sets/replaces the custom assets which your UI may make use of.|return ` boolean `|[#setcustomassets](#setcustomassets)|
|setValue( ` string ` id, ` string ` value)|Updates the value between elements tags, like: `<Text>ValueChanged</Text>`|return ` boolean `|[#setvalue](#setvalue)|
|setXml( ` string ` xml, ` table ` assets)|Sets/replaces the UI with the contents of the provided XML.|return ` boolean `|[#setxml](#setxml)|
|setXmlTable( ` table ` data, ` table ` assets)|Sets/replaces the UI with the contents of the provided UI table.|return ` boolean `|[#setxmltable](#setxmltable)|
|show( ` string ` id)|Displays the given UI element. Unlike the "active" attribute, show triggers animations.|return ` boolean `|[#show](#show)|

---

## Function Details {#function-details}

### getAttribute(...) {#getattribute}

[../types/](../types/)Obtains the value of a specified attribute of a UI element. What it returns will typically be a string or a number.
> **Info: getAttribute(id, attribute)**
>
> * [../types/](../types/) **id**: The Id that was assigned, as an attribute, to the desired XML UI element.
> * [../types/](../types/) **attribute**: The name of the attribute you wish to get the value of.
>
```lua
self.UI.getAttribute("testElement", "fontSize")
```

---

### getAttributes(...) {#getattributes}

[../types/](../types/)Returns the attributes and their values of a UI element. It only returns the attributes (and values) for elements that have had those attributes set by the user.
> **Info: getAttributes(id)**
>
> * [../types/](../types/) **id**: The Id that was assigned, as an attribute, to the desired XML UI element.
> **Info: Return table**
> * [../types/](../types/) **parameters**: A Table with the attributes as keys and their XML value as the key's value.
>
> * [../types/](../types/) **texture**: The name of the image element
> * [../types/](../types/) **color**: The hex used for the color element's value.
> * [../types/](../types/) **texture**: The name of the image element
> * [../types/](../types/) **color**: The hex used for the color element's value.
> **IMPORTANT**: This return table is an example of one you may get back from using it on a RawImage element type. The attribute keys you get back and their values will depend on the element you use the function on as well as the attributes you, the user, have assigned to it.

---

### getCustomAssets() {#getcustomassets}

[../types/](../types/)Returns a table/array of [custom assets](#setcustomassets-custom-assets).
> **Example: Example**
> Log the UI's current custom assets.
>
> ```lua
> log(UI.getCustomAssets())
> ```
>
> ```lua
> log(UI.getCustomAssets())
> ```

---

### getValue(...) {#getvalue}

[../types/](../types/)Obtains the value between elements tags, like: `<Text>ValueObtained</Text>`
> **Info: getValue(id)**
>
> * [../types/](../types/) **id**: The Id that was assigned, as an attribute, to the desired XML UI element.
>
```lua
string = UI.getValue("testElement")
print(string)
```

---

### getXmlTable() {#getxmltable}

[../types/](../types/)Returns the contents of the current UI formatted as a table.
Example Returned Table:

```lua
{
 {
 tag="HorizontalLayout",
 attributes={
 height=200,
 width=1000,
 color="rgba(0,0,0,0.7)",
 },
 children={
 {
 tag="Text",
 attributes={
 fontSize=100,
 color="red",
 },
 value="Example",
 },
 {
 tag="Text",
 attributes={
 text="Message",
 fontSize=100,
 color="blue",
 },
 },
 }
 }
}
```

What the XML would look like which returns that table:

```lua
<HorizontalLayout height="200" width="1000" color="rgba(0,0,0,0.7)">
 <Text fontSize="100" color="red">Example</Text>
 <Text text="Message" fontSize="100" color="blue" />
</HorizontalLayout>
```

---

### hide(...) {#hide}

[../types/](../types/)Hides the given UI element. Unlike the "active" attribute, hide triggers animations.
> **Info: hide(id)**
>
> * [../types/](../types/) **id**: The Id that was assigned, as an attribute, to the desired XML UI element.
>
```lua
self.UI.hide("testElement")
```

---

### setAttribute(...) {#setattribute}

[../types/](../types/)Sets the value of a specified attribute of a UI element.
> **Note: Important**
> This will override the run-time value from the XML UI for all players, forcing them to see the same value.
> **Info: setAttribute(id, attribute, value)**
>
> * [../types/](../types/) **id**: The Id that was assigned, as an attribute, to the desired XML UI element.
> * [../types/](../types/) **attribute**: The name of the attribute you want to set the value of.
> * [../types/](../types/) **value**: The value to set for the attribute.
>
```lua
self.UI.setAttribute("testElement", "fontSize", 200)
```

---

### setAttributes(...) {#setattributes}

[../types/](../types/)Updates the value of the supplied attributes of a UI element. You do not need to set every attribute with the data table, an element will continue using any previous values you do not overwrite.
> **Note: Important**
> This will override the run-time value from the XML UI for all players, forcing them to see the same value.
> **Info: setAttributes(id, data)**
>
> * [../types/](../types/) **id**: The Id that was assigned, as an attribute, to the desired XML UI element.
> * [../types/](../types/) **data**: A Table with key/value pairs representing attributes and their values.
> **Info: Example data table**
> * [../types/](../types/) **data**: A Table with parameters which guide the function.
>
> * [../types/](../types/) **data.fontSize**: Attribute's desired value value
> * [../types/#vector](../types/#vector) **data.color**: Attribute's desired value
> * [../types/](../types/) **data.fontSize**: Attribute's desired value value
> * [../types/#vector](../types/#vector) **data.color**: Attribute's desired value
> **IMPORTANT**: This table is an example of one you may use when setting a text UI element. The attribute keys you use and their values will depend on the element you use the function on.
>
```lua
attributeTable = {
 fontSize = 300,
 color = "#000000"
}
self.UI.setAttributes("exampleText", attributeTable)
```

---

### setClass(...) {#setclass}

[../types/](../types/)Replaces all classes on a UI element.
> **Info: setClass(id, names)**
>
> * [../types/](../types/) **id**: The ID of the UI element that should have its classes replaced.
> * [../types/](../types/) **names**: Space separated class names.
> **Example: Example**
> Replace all classes on the element with ID ` someElementId ` with two classes "important" and "large".
>
> ```lua
> UI.setClass("someElementId", "important large")
> ```
>
> ```lua
> UI.setClass("someElementId", "important large")
> ```

---

### setCustomAssets(...) {#setcustomassets}

[../types/](../types/)Sets/replaces the custom assets which your UI may make use of. Providing an empty table will remove all existing UI Assets.
> **Warning: Warning**
> This function will overwrite/replace any currently existing assets in Custom UI Assets, not add to them.
> **Info: setCustomAssets(assets)**
>
> * [../types/](../types/) **assets**: A table/array containing sub-tables which each represent a [custom asset](#setcustomassets-custom-assets).
>
#### Custom Assets {#setcustomassets-custom-assets}

Custom assets are represented as a table with the following properties:

|Name|Type|Default|Description|
|---|---|---|---|
|name|` string `|Mandatory|The name you'll use to refer to this asset in your XML UI.|
|url|` string `|Mandatory|The URL this asset will be loaded from.|

Currently, only images are supported as custom assets.
> **Example: Example**
> Add two images which can be used within your XML UI.
>
> ```lua
> UI.setCustomAssets({
> {
> name = "Image1",
> url = "http://placehold.it/120x120&text=image1"
> },
> {
> name = "Image2",
> url = "http://placehold.it/120x120&text=image2"
> },
> })
> ```
>
> ```lua
> UI.setCustomAssets({
> {
> name = "Image1",
> url = "http://placehold.it/120x120&text=image1"
> },
> {
> name = "Image2",
> url = "http://placehold.it/120x120&text=image2"
> },
> })
> ```

---

### setValue(...) {#setvalue}

[../types/](../types/)Updates the value between elements tags, like: `<Text>ValueChanged</Text>`
> **Info: setValue(id, value)**
>
> * [../types/](../types/) **id**: The Id that was assigned, as an attribute, to the desired XML UI element.
> * [../types/](../types/) **value**: The value to put between the element tags.
>
```lua
UI.setValue("testElement", "New Text To Display")
```

---

### setXml(...) {#setxml}

[../types/](../types/)Sets/replaces the UI with the contents of the provided XML.
> **Info: setXml(xml, assets)**
>
> * [../types/](../types/) **xml**: A string containing XML representing the desired UI.
> * [../types/](../types/) **assets**: A table/array containing sub-tables which each represent a [custom asset](#setcustomassets-custom-assets).
>
> * Optional. When omitted existing custom assets will not be modified.
> * Optional. When omitted existing custom assets will not be modified.
> **Warning: Warning**
> UI changes do not take effect immediately. Any attempt to query the contents of the XML will return stale results
> until [loading](#loading)returns to ` false `.
> **Example: Example**
> Display a single text label with the contents "Test".
>
> ```lua
> UI.setXml("<Text>Test</Text>")
> ```
>
> ```lua
> UI.setXml("<Text>Test</Text>")
> ```

---

### setXmlTable(...) {#setxmltable}

[../types/](../types/)Sets/replaces the UI with the contents of the provided UI table.
> **Info: setXmlTable(data, assets)**
>
> * [../types/](../types/) **data**: A table containing sub-tables. One sub-table for each element being created.
>
> * [../types/](../types/) **tag**: The element type.
> * [../types/](../types/) **attributes**: A table containing attribute names for keys. Available attribute types depend on tag's element type.
>
> * Optional, defaults to not being used.
> * Example key/value pairs: text="Test", color="black"
> * [../types/](../types/) **value**: Text that appears `<Text>Here</Text>`, between the opening and closing tag.
>
> * Optional, defaults to an empty string.
> * [../types/](../types/) **children**: A table containing more sub-tables, formatted as above. This does mean the sub-tables can contain their own children as well, containing sub-sub tables, etc.
>
> * Optional, defaults to not being used.
> * [../types/](../types/) **assets**: A table/array containing sub-tables which each represent a [custom asset](#setcustomassets-custom-assets).
>
> * Optional. When omitted existing custom assets will not be modified.
> * [../types/](../types/) **tag**: The element type.
> * [../types/](../types/) **attributes**: A table containing attribute names for keys. Available attribute types depend on tag's element type.
>
> * Optional, defaults to not being used.
> * Example key/value pairs: text="Test", color="black"
> * [../types/](../types/) **value**: Text that appears `<Text>Here</Text>`, between the opening and closing tag.
>
> * Optional, defaults to an empty string.
> * [../types/](../types/) **children**: A table containing more sub-tables, formatted as above. This does mean the sub-tables can contain their own children as well, containing sub-sub tables, etc.
>
> * Optional, defaults to not being used.
> * Optional, defaults to not being used.
> * Example key/value pairs: text="Test", color="black"
> * Optional, defaults to an empty string.
> * Optional, defaults to not being used.
> * Optional. When omitted existing custom assets will not be modified.
> **Warning: Warning**
> UI changes do not take effect immediately. Any attempt to query the contents of the XML will return stale results
> until [loading](#loading)returns to ` false `.
> **Example: Example**
> Display two text labels within a horizontal layout.
>
> ```lua
> UI.setXmlTable({
> {
> tag="HorizontalLayout",
> attributes={
> height=200,
> width=1000,
> color="rgba(0,0,0,0.7)",
> },
> children={
> {
> tag="Text",
> attributes={
> fontSize=100,
> color="red",
> },
> value="Example",
> },
> {
> tag="Text",
> attributes={
> text="Message",
> fontSize=100,
> color="blue",
> },
> },
> }
> }
> })
> ```
>
> ```lua
> UI.setXmlTable({
> {
> tag="HorizontalLayout",
> attributes={
> height=200,
> width=1000,
> color="rgba(0,0,0,0.7)",
> },
> children={
> {
> tag="Text",
> attributes={
> fontSize=100,
> color="red",
> },
> value="Example",
> },
> {
> tag="Text",
> attributes={
> text="Message",
> fontSize=100,
> color="blue",
> },
> },
> }
> }
> })
> ```

---

### show(...) {#show}

[../types/](../types/)Shows the given UI element. Unlike the "active" attribute, show triggers animations.
> **Info: show(id)**
>
> * [../types/](../types/) **id**: The Id that was assigned, as an attribute, to the desired XML UI element.
>
```lua
self.UI.show("testElement")
```

---
