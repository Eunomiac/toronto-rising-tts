## Table of Contents

* Function Summary
* Function Details
  * decode(...)
  * encode(...)
  * encode_pretty(...)

# JSON

The static global JSON class provides the ability to encode/decode data into JSON strings. This is largely used by the [onSave()](../events/#onsave)event function, but has other potential applications as well. The JSON class can be used on any String, Int, Float or Table. You call these functions like this: `JSON.encode(...)`.
> **Warning: Warning**
> This class **does not**work with Object references. Use the Object's GUID instead.
>
## Function Summary {#function-summary}

|Function Name|Description|Return| |
|---|---|---|---|
|decode( ` string ` json_string)|Value obtained from the encoded string. Can return a number, string or Table.|return ` variable `|[#decode](#decode)|
|encode( ` variable ` data)|Encodes data from a number, string or Table into a JSON string.|return ` string `|[#encode](#encode)|
|encode_pretty( ` variable ` data)|Same as encode(...) but this version is slightly less efficient but is easier to read.|return ` string `|[#encode_pretty](#encode_pretty)|

## Function Details {#function-details}

### decode(...) {#decode}

[../types/](../types/)Value obtained from the encoded string. Can return a number, string or Table.
> **Info: decode(json_string)**
>
> * [../types/](../types/) **json_string**: A String that is decoded, generally created by encode(...) or encode_pretty(...).
>
```lua
coded = JSON.encode("Test")
print(coded) --Prints "Test"
decoded = JSON.decode(coded)
print(decoded) --Prints Test
```

---

### encode(...) {#encode}

[../types/](../types/)Encodes data from a number, string or Table into a JSON string.
> **Info: encode(data)**
>
> * [../types/](../types/) **data**: A Var, either String, Int, Float or Table, to encode as a string.

---

### encode_pretty(...) {#encode_pretty}

[../types/](../types/)Encodes data from a number, string or Table into a JSON string. This version is slightly less efficient but is easier to read.
> **Info: encode_pretty(data)**
>
> * [../types/](../types/) **data**: A Var, either String, Int, Float or Table, to encode as a string.
