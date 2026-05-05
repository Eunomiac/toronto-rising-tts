---@meta

-- LuaLS-only type declarations for Tabletop Simulator Unity bridge classes.
-- This file is not required at runtime; it only teaches the language server
-- about common TTS component/class names used in annotations.

---@class Component
local Component = {}

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

---@class GameObject: Object
local GameObject = {}

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
  GameObject = GameObject
}
