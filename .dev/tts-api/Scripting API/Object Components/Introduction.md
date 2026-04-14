## Table of Contents

* GameObjects
* Components
* Vars
* Materials

# Introduction
>
> **Note: Danger**
> Component APIs are an advanced feature. An **understanding of how Unity works is required**to utilize them.
A Component is a collection of functions and variables that allow you to control object behavior.
Components are a [Unity concept](https://docs.unity3d.com/Manual/Components.html), they're the building blocks that
Tabletop Simulator objects are composed of.

## GameObjects {#gameobjects}

Every object in Tabletop Simulator is a [GameObject](../gameobject/). When a game is created, GameObjects are loaded,
initialized and *some*of these top-level GameObjects are then exposed via Tabletop Simulator's Lua scripting APIs
as regular [Objects](../../object/), each with their own scripting contexts.
Some Lua-exposed Objects are made-up of a hierarchy of children GameObjects. The Component APIs allow you to access and
interact with these children GameObjects (which you'd otherwise be unable to control).

## Components {#components}

GameObjects are themselves made up of [Components](../component/). A typical GameObject would contain a Collider,
Transform, Mesh etc. These Components describe the GameObject's behavior and visual representation.
> **Tip: Tip**
> In addition to built-in Objects, the Component APIs provide access the GameObjects and Components that exist in
> AssetBundles. This means that when creating an AssetBundle, you may attach all manner of components (lights, sounds
> etc.) and you'll be able to control them via these APIs.
>
## Vars {#vars}

Each Component has **Vars**. These are variables which you can modify to change how that Component affects the
GameObject it composes.

## Materials {#materials}

GameObjects with Renderer components typically also have attached [Materials](../material/), which govern the appearance of the object.
