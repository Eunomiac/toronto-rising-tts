---@meta

-- LuaLS-only type declarations for Tabletop Simulator Unity bridge classes.
-- This file is not required at runtime; it only teaches the language server
-- about common TTS component/class names used in annotations.

---@class Component
local Component = {}
---@param key string
---@return any
function Component:get(key) end
---@param key string
---@param value any
function Component:set(key, value) end

---@class Transform: Component
local Transform = {}

---@class Light: Component
local Light = {}

---@class Material: Component
local Material = {}

---@class Renderer: Component
local Renderer = {}

---@class Collider: Component
local Collider = {}

---@class Rigidbody: Component
local Rigidbody = {}

---@class AudioSource: Component
local AudioSource = {}

---@class Camera: Component
local Camera = {}

---@class AudioListener: Component
local AudioListener = {}

---@class Object
local Object = {}
---@return Vector
function Object:getPosition() end
---@return Vector
function Object:getRotation() end
---@param componentType string
---@return Component|nil
function Object:getComponentInChildren(componentType) end
---@param componentType string
---@return Component[]
function Object:getComponentsInChildren(componentType) end
---@return Object[]
function Object:getChildren() end
---@param notes string
function Object:setGMNotes(notes) end
---@return string
function Object:getGMNotes() end
---@return string[]
function Object:getTags() end
---@param tags string[]
function Object:setTags(tags) end

---@class GameObject: Object
local GameObject = {}

---@class Vector
local Vector = {}

---@class Color
local Color = {}

---@class Player
---@field color string
---@field steam_name string
---@field steam_id string|number
local Player = {}
---@param mode string
function Player:setCameraMode(mode) end
---@param position Vector|table
function Player:lookAt(position) end

---@class HandsAPI
---@field playerToPositionMap table<string, any>
local HandsAPI = {}

---@type HandsAPI
Hands = Hands

---@param tags string[]
---@return Object[]
function getObjectsWithAllTags(tags) end

---@param color string
---@return table
function stringColorToRGB(color) end

---@param style string
---@param color table
---@param prefix string
---@param suffix string
function logStyle(style, color, prefix, suffix) end

return {
  Component = Component,
  Transform = Transform,
  Light = Light,
  Material = Material,
  Renderer = Renderer,
  Collider = Collider,
  Rigidbody = Rigidbody,
  AudioSource = AudioSource,
  Camera = Camera,
  AudioListener = AudioListener,
  Object = Object,
  GameObject = GameObject,
  Vector = Vector,
  Color = Color,
  Player = Player
}
