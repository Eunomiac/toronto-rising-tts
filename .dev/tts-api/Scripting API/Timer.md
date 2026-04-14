## Table of Contents

* Function Summary
* Function Details
  * create(...)
  * destroy(...)

# Timer
>
> **Note: Deprecated**
> Use [Wait.frames(...)](../wait/#time)instead.
`Timer` is a static global class which provides methods for executing other functions after a delay and/or repeatedly. Each Timer is tracked by a unique "identifier" string.
> **Warning: Warning**
> The "identifiers" are shared between Global and all Object scripts, so each Timer must have a unique name.
>
## Function Summary {#function-summary}

|Function Name|Description|Return| |
|---|---|---|---|
|create( ` table ` parameters)|Creates a Timer. It will auto-delete once its repetitions have been completed.|return ` boolean `|[#create](#create)|
|destroy( ` string ` identifier)|Destroys a Timer.|return ` boolean `|[#destroy](#destroy)|

## Function Details {#function-details}

### create(...) {#create}

[../types/](../types/)Creates a Timer. It will auto-delete once its repetitions have been completed.
> **Info: create(parameters)**
>
> * [../types/](../types/) **parameters**: A Table containing the information used to start the Timer.
>
> * [../types/](../types/) **identifier**: Timer's name, used to destroy it. Must be unique within all other scripts.
> * [../types/](../types/) **function_name**: Name of function to trigger when time is reached.
> * [../types/](../types/) **function_owner**: Where the function from function_name exists.
>
> * Optional, defaults to the calling Object.
> * [../types/](../types/) **parameters**: Table containing any data that will be passed to the function.
>
> * Optional, will not be used by default.
> * [../types/](../types/) **delay**: Length of time in seconds before the function is triggered.
>
> * Optional, defaults to 0.
> * 0 results in a delay of 1 frame before the triggered function activates.
> * [../types/](../types/) **repetitions**: Number of times the countdown repeats.
>
> * Optional, defaults to 1.
> * Use 0 for infinite repetitions.
> * [../types/](../types/) **identifier**: Timer's name, used to destroy it. Must be unique within all other scripts.
> * [../types/](../types/) **function_name**: Name of function to trigger when time is reached.
> * [../types/](../types/) **function_owner**: Where the function from function_name exists.
>
> * Optional, defaults to the calling Object.
> * [../types/](../types/) **parameters**: Table containing any data that will be passed to the function.
>
> * Optional, will not be used by default.
> * [../types/](../types/) **delay**: Length of time in seconds before the function is triggered.
>
> * Optional, defaults to 0.
> * 0 results in a delay of 1 frame before the triggered function activates.
> * [../types/](../types/) **repetitions**: Number of times the countdown repeats.
>
> * Optional, defaults to 1.
> * Use 0 for infinite repetitions.
> * Optional, defaults to the calling Object.
> * Optional, will not be used by default.
> * Optional, defaults to 0.
> * 0 results in a delay of 1 frame before the triggered function activates.
> * Optional, defaults to 1.
> * Use 0 for infinite repetitions.
>
```lua
function onLoad()
 dataTable = {welcome="Hello World!"}
 Timer.create({
 identifier = "A Unique Name",
 function_name = "fiveAfterOne",
 parameters = dataTable,
 delay = 1,
 repetitions = 5,
 })
end
function fiveAfterOne(params)
 print(params.welcome)
end
```

> **Tip: Tip**
> If your timer is on an Object, a good way to establish a unique identifier for it is to use the item's GUID!

---

### destroy(...) {#destroy}

[../types/](../types/)Destroys a Timer. A timer, if it completes its number of repetitions, will automatically destroy itself.
> **Info: destroy(identifier)**
>
> * [../types/](../types/) **identifier**: The unique identifier for the timer you want to destroy.
