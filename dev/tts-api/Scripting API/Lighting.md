## Table of Contents

* Member Variables
* Function Summary
  * Functions
    * apply()
    * getAmbientEquatorColor()
    * getAmbientGroundColor()
    * getLightColor()
    * setAmbientEquatorColor(...)
    * setAmbientGroundColor(...)
    * setAmbientSkyColor(...)
    * setLightColor(...)

# Lighting

Lighting, a static global class, is the in-game light of the map. It allows you to modify the lighting of the instance in the same way that the [in-game lighting menu](https://kb.tabletopsimulator.com/host-guides/lighting/)does. You call these functions like this: `Lighting.apply()`.
For more information on lighting in Unity, [refer to the Unity documentation](https://docs.unity3d.com/Manual/LightingOverview.html).
> **Example: Example**
> Make the lighting *bright*red.
>
> ```lua
> Lighting.light_intensity = 2
> Lighting.setLightColor({r = 1, g = 0.6, b = 0.6})
> Lighting.apply()
> ```
>
> ```lua
> Lighting.light_intensity = 2
> Lighting.setLightColor({r = 1, g = 0.6, b = 0.6})
> Lighting.apply()
> ```
>
## Member Variables {#member-variables}

|Variable|Type|Description|
|---|---|---|
|ambient_intensity|` float `|The strength of the ambient light. Range = 0 to 4.|
|ambient_type|` int `|The source of ambient light. 1 = background, 2 = gradient.|
|light_intensity|` float `|The strength of the directional light shining down in the scene. Range = 0 to 4.|
|lut_contribution|` float `|How much the LUT contributes to the light.|
|lut_index|` int `|The LUT index of the light.|
|lut_url|` string `|The URL of the LUT.|
|reflection_intensity|` float `|The strength of the reflections from the background. Range = 0 to 1.|

## Function Summary {#function-summary}

### Functions {#functions}

|Function Name|Return|Description|
|---|---|---|
|apply()|return ` boolean `|Applies pending changes made via the Lighting class.|
|getAmbientEquatorColor()|return ` color `|Returns Color Table of the gradient equator. Not used if `ambient_type = 1`.|
|getAmbientGroundColor()|return ` color `|Returns Color Table of the gradient ground. Not used if `ambient_type = 1`.|
|getAmbientSkyColor()|return ` color `|Returns Color Table of the gradient sky. Not used if `ambient_type = 1`.|
|getLightColor()|return ` color `|Returns Color Table of the directional light, which shines straight down on the table.|
|setAmbientEquatorColor( ` color ` tint)|return ` boolean `|Sets the color of the gradient equator. Not used if `ambient_type = 1`.|
|setAmbientGroundColor( ` color ` tint)|return ` boolean `|Sets the color of the gradient ground. Not used if `ambient_type = 1`.|
|setAmbientSkyColor( ` color ` tint)|return ` boolean `|Sets the color of the gradient sky. Not used if `ambient_type = 1`.|
|setLightColor( ` color ` tint)|return `boolean`|Sets the color of the directional light, which shines straight down on the table.|
