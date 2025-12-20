## Table of Contents

* Member Variables

# Time

`Time`, not to be confused with the deprecated [Timer](../timer/)class, is a static global class which provides access
to Unity's time information.
> **Example: Example Usage**
>
> ```lua
> Time.time
> ```
>
## Member Variables {#member-variables}

|Function Name|Description|Return|
|---|---|---|
|time|The current time. Works like `os.time()` but is more accurate. Read only.|return ` float `|
|delta_time|The amount of time since the last frame. Read only.|return ` float `|
|fixed_delta_time|The interval (in seconds) between physics updates. Read only.|return `float`|
