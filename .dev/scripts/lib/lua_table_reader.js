"use strict";

/**
 * Read a top-level `Name.Path = { … }` / `local Name = { … }` table constructor from a Lua file
 * into plain JS (strings, numbers, booleans, nested objects / arrays). Non-literal values
 * (function calls, functions, references) become `{ $expr: "<kind>" }`.
 */

const fs = require("fs");
const luaparse = require("luaparse");

/** @param {any} node @returns {string|null} */
function dottedName(node) {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && node.indexer === ".") {
    const base = dottedName(node.base);
    return base === null ? null : `${base}.${node.identifier.name}`;
  }
  return null;
}

/** @param {string} latin1 @returns {string} */
const utf8 = (latin1) => Buffer.from(latin1, "latin1").toString("utf8");

/** @param {any} node @returns {any} */
function toValue(node) {
  switch (node.type) {
    case "StringLiteral":
      return utf8(node.value);
    case "NumericLiteral":
    case "BooleanLiteral":
      return node.value;
    case "NilLiteral":
      return null;
    case "UnaryExpression":
      if (node.operator === "-" && node.argument.type === "NumericLiteral") return -node.argument.value;
      return { $expr: node.type };
    case "TableConstructorExpression": {
      const keyed = node.fields.some((f) => f.type !== "TableValue");
      if (!keyed) return node.fields.map((f) => toValue(f.value));
      const out = {};
      let index = 1;
      for (const f of node.fields) {
        if (f.type === "TableKeyString") out[f.key.name] = toValue(f.value);
        else if (f.type === "TableKey") out[String(toValue(f.key))] = toValue(f.value);
        else out[index++] = toValue(f.value);
      }
      return out;
    }
    default: {
      const name = dottedName(node);
      return { $expr: name === null ? node.type : name };
    }
  }
}

/**
 * @param {string} filePath
 * @param {string} name e.g. `Catalog.TRACKS`, `CD.Defs`, `Districts` (for `local Districts = {…}`)
 * @returns {any}
 */
function readLuaTable(filePath, name) {
  const source = fs.readFileSync(filePath, "latin1");
  const ast = luaparse.parse(source, { luaVersion: "5.2", encodingMode: "pseudo-latin1" });
  for (const stmt of ast.body) {
    if (stmt.type !== "AssignmentStatement" && stmt.type !== "LocalStatement") continue;
    const at = stmt.variables.findIndex((v) => dottedName(v) === name);
    if (at >= 0 && stmt.init[at] && stmt.init[at].type === "TableConstructorExpression") {
      return toValue(stmt.init[at]);
    }
  }
  throw new Error(`${filePath}: no top-level table assignment to ${name}`);
}

module.exports = { readLuaTable };
