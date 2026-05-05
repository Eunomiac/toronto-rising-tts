---@meta

-- LuaLS-only type declarations for Tabletop Simulator Unity bridge classes.
-- This file is not required at runtime; it only teaches the language server
-- about common TTS component/class names used in annotations.

---@class Component
---@field name string|nil
local Component = {}
---@param ... any
---@return any
function Component.get(...) end
---@param property string
---@param value any
function Component.set(property, value) end

---@class ObjectUI
local ObjectUI = {}
---@param id string
---@param attribute string
---@param value string|boolean|number
function ObjectUI.setAttribute(id, attribute, value) end

---@class Vector
---@field x number
---@field y number
---@field z number
local Vector = {}

---@class Bounds
---@field center Vector
---@field size Vector
local Bounds = {}

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

--- Preset tables under `C.UniversalCameraAngles` / `C.RedCameraAngles` (camera authoring).
---@class TtsCameraAnglePreset
---@field position Vector|table|nil
---@field isRelativeToReferenceHandPosition boolean|nil
---@field pitch number|nil
---@field yaw number|nil
---@field distance number|nil
---@field cameraMode string|nil

---@class Object
---@field name string|nil
---@field tag string|nil
---@field type string|nil
---@field locked boolean|nil
---@field interactable boolean
---@field UI ObjectUI|nil
local Object = {}
---@return Vector
function Object.getPosition(...) end
---@return Vector
function Object.getRotation(...) end
---@return string
function Object.getGUID(...) end
---@return string
function Object.getName(...) end
---@param ... any
---@return Component|nil
function Object.getComponentInChildren(...) end
---@param ... any
---@return Component[]
function Object.getComponentsInChildren(...) end
---@param ... any
---@return Component[]
function Object.getComponents(...) end
---@return Object[]
function Object.getChildren(...) end
---@param ... any
function Object.setGMNotes(...) end
---@return string
function Object.getGMNotes(...) end
---@return string[]
function Object.getTags(...) end
---@param ... any
function Object.setTags(...) end
---@param data table
function Object.setCustomObject(data) end
function Object.reload(...) end
---@param name string
function Object.setName(name) end
---@param position Vector|table
---@param collapse_into_bags boolean|nil
---@param fast boolean|nil
function Object.setPosition(position, collapse_into_bags, fast) end
---@param rotation Vector|table
function Object.setRotation(rotation) end
---@param tag string
---@return boolean
function Object.hasTag(tag) end
---@param tag string
function Object.addTag(tag) end
---@param tag string
function Object.removeTag(tag) end
---@param playerColors string[]
function Object.setInvisibleTo(playerColors) end
---@return Bounds
function Object.getBounds(...) end
---@return boolean
function Object.getLock(...) end
---@param locked boolean
function Object.setLock(locked) end
---@return Object[]
function Object.getObjects(...) end
---@return table
function Object.getData(...) end
---@param value string|number|boolean
function Object.setValue(value) end
---@param tint Color|table
function Object.setColorTint(tint) end
---@param options table|nil
---@return Object|nil
function Object.clone(options) end

---@class GameObject: Object
local GameObject = {}

---@class Color
---@field r number|nil
---@field g number|nil
---@field b number|nil
---@field a number|nil
local Color = {}

---@class Player
---@field color string
---@field steam_name string
---@field steam_id string|number
local Player = {}
---@param ... any
function Player.setCameraMode(...) end
---@param ... any
function Player.lookAt(...) end

---@class HandsAPI
---@field playerToPositionMap table<string, any>
local HandsAPI = {}
---@return table
function HandsAPI.getHands(...) end

---@type HandsAPI
Hands = Hands or {}

---@return Object[]
function getObjectsWithAllTags(...) end

---@param guid string
---@return Object|nil
function getObjectFromGUID(guid) end

---@return table
function stringColorToRGB(...) end

function logStyle(...) end

return {
  Component = Component,
  ObjectUI = ObjectUI,
  Bounds = Bounds,
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
