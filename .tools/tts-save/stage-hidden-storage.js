"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const HIDE_Y = -150;

function loadGuidValues(guidsSource) {
  const values = {};
  const re = /(\w+)\s*=\s*"([0-9a-fA-F]{6})"/g;
  let match = re.exec(guidsSource);
  while (match) {
    values[match[1]] = match[2].toLowerCase();
    match = re.exec(guidsSource);
  }
  return values;
}

function loadStagedMap(repo = ROOT) {
  const guids = loadGuidValues(fs.readFileSync(path.join(repo, "lib/guids.ttslua"), "utf8"));
  const bagGuid = guids.HIDDEN_STORAGE;
  if (!bagGuid) throw new Error("G.GUIDS.HIDDEN_STORAGE is missing.");
  const source = fs.readFileSync(path.join(repo, "lib/constants.ttslua"), "utf8");
  const block = source.match(/C\.StagedObjects\s*=\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error("C.StagedObjects is missing.");
  const staged = {};
  const re = /\[G\.GUIDS\.(?:TABLES\.)?([A-Za-z0-9_]+)\]\s*=\s*(true|false)/g;
  let match = re.exec(block[1]);
  while (match) {
    const guid = guids[match[1]];
    if (!guid) throw new Error(`C.StagedObjects names G.GUIDS.${match[1]}, which has no GUID.`);
    staged[guid] = match[2] === "true";
    match = re.exec(block[1]);
  }
  if (Object.keys(staged).length === 0) throw new Error("C.StagedObjects is empty.");
  return { bagGuid, staged };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function locate(objectStates, guid) {
  function walk(list) {
    if (!Array.isArray(list)) return null;
    for (let index = 0; index < list.length; index += 1) {
      const object = list[index];
      if (object && object.GUID === guid) return { list, index };
      const nested = walk(object && object.ContainedObjects);
      if (nested) return nested;
    }
    return null;
  }
  return walk(objectStates);
}

function wasHidden(object) {
  const tags = Array.isArray(object.Tags) ? object.Tags : [];
  const y = object.Transform && object.Transform.posY;
  return tags.includes("HiddenObject") || (typeof y === "number" && y <= HIDE_Y);
}

function snapshot(object, releaseHidden) {
  const transform = object.Transform || {};
  return {
    position: { x: transform.posX ?? 0, y: transform.posY ?? 0, z: transform.posZ ?? 0 },
    rotation: { x: transform.rotX ?? 0, y: transform.rotY ?? 0, z: transform.rotZ ?? 0 },
    locked: object.Locked === true,
    interactable: object.DragSelectable !== false,
    wasHidden: wasHidden(object),
    releaseHidden,
  };
}

function packStagedObjects(objectStates, map = loadStagedMap()) {
  const present = Object.keys(map.staged).filter((guid) => locate(objectStates, guid));
  if (present.length === 0) return { objectStates, stagedObjects: {}, packed: 0 };
  const states = clone(objectStates);
  const bagHit = locate(states, map.bagGuid);
  if (!bagHit) throw new Error(`Hidden storage bag ${map.bagGuid} is not in the save.`);
  const bag = bagHit.list[bagHit.index];
  if (!Array.isArray(bag.ContainedObjects)) bag.ContainedObjects = [];
  const stagedObjects = {};
  for (const guid of present) {
    if (guid === map.bagGuid) throw new Error("The hidden storage bag cannot be stored inside itself.");
    const hit = locate(states, guid);
    const object = hit.list.splice(hit.index, 1)[0];
    stagedObjects[guid] = snapshot(object, map.staged[guid] === true);
    bag.ContainedObjects.push(object);
  }
  return { objectStates: states, stagedObjects, packed: present.length };
}

module.exports = { loadStagedMap, packStagedObjects, wasHidden };
