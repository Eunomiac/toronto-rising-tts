"use strict";
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..", "..");
const INCLUDE_RE = /<Include\s+src\s*=\s*"([^"]+)"\s*\/>/gi;
function resolveIncludePath(projectRoot, fromFile, src) {
  for (const candidate of [
    path.resolve(path.dirname(fromFile), src),
    path.resolve(projectRoot, src),
    path.resolve(projectRoot, "ui", src),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Include not found: ${src}`);
}
function expandXmlFile(projectRoot, filePath, stack) {
  const abs = path.resolve(filePath);
  if (stack.has(abs)) throw new Error(`Circular Include: ${abs}`);
  stack.add(abs);
  const expanded = fs.readFileSync(abs, "utf8").replace(INCLUDE_RE, (_m, src) => {
    const childPath = resolveIncludePath(projectRoot, abs, src);
    const childRel = path.relative(projectRoot, childPath).split(path.sep).join("/");
    return `\n<!-- include ${childRel} -->\n${expandXmlFile(projectRoot, childPath, stack)}\n<!-- /include ${childRel} -->\n`;
  });
  stack.delete(abs);
  return expanded;
}
const xml = expandXmlFile(REPO, path.join(REPO, "ui", "Global.xml"), new Set());
if (/refPanel_Coteries|toggle_Coteries|HUD_playerCoteries|refPanel_coteries/.test(xml)) {
  throw new Error("expanded Global XML still contains the coteries menu");
}
const out = path.join(REPO, ".tts", "objects", "Global.xml");
fs.writeFileSync(out, xml.endsWith("\n") ? xml : `${xml}\n`);
console.log(`wrote ${out}`);
