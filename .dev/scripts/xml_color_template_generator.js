/**
 * XML UI template generator
 *
 * Agent guidance: .dev/TTS_BUNDLING_SETUP.md (section “XML UI template generator”).
 * Player HUD spec: .dev/HUDs & Overlays/Player HUD Overview.md.
 *
 * - Reads each `*.xml` under `ui/.templates/`.
 * - The file MUST begin with a single-line comment: <!-- TARGET: relative/path.xml -->
 *   (path relative to project root, forward slashes, no ..).
 * - Extracts exactly one root element from the template body (lightweight tag stack).
 * - If root contains `@@color@@`, duplicates the root once per `C.PlayerColors` from lib/constants.ttslua.
 * - Otherwise writes a single root (pass-through).
 * - Prepends a banner pointing editors back to the template source.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_TOKEN = "@@color@@";
/** First non-empty line of each template must match this prefix (case-sensitive TARGET:). */
const TARGET_COMMENT_REGEX = /^<!--\s*TARGET:\s*(\S+)\s*-->\s*$/;

/**
 * @param {string} constantsPath
 * @returns {string[]}
 */
function readPlayerColorsFromConstants(constantsPath) {
  const constantsText = fs.readFileSync(constantsPath, "utf8");
  const match = constantsText.match(/C\.PlayerColors\s*=\s*\{([\s\S]*?)\}/m);
  if (!match) {
    throw new Error("Failed to locate C.PlayerColors in lib/constants.ttslua");
  }

  const colors = [];
  const quoted = match[1].matchAll(/"([^"]+)"/g);
  for (const m of quoted) {
    colors.push(m[1]);
  }
  if (colors.length === 0) {
    throw new Error("Failed to extract any player colors from C.PlayerColors");
  }
  return colors;
}

/**
 * Normalizes TARGET path segments and ensures the path stays inside `projectRoot`.
 * @param {string} rawPath Path taken from the TARGET XML comment (forward slashes).
 * @param {string} projectRoot Absolute project root directory.
 * @returns {string} Relative path using forward slashes.
 */
function validateAndNormalizeTargetPath(rawPath, projectRoot) {
  const trimmed = rawPath.trim();
  if (trimmed === "" || trimmed.includes("..")) {
    throw new Error(`Invalid TARGET path (empty or contains ..): "${rawPath}"`);
  }
  const normalized = trimmed.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error(`TARGET must be relative to project root, got: "${rawPath}"`);
  }
  const abs = path.normalize(path.join(projectRoot, ...normalized.split("/")));
  const rel = path.relative(projectRoot, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`TARGET resolves outside project root: "${rawPath}"`);
  }
  return rel.split(path.sep).join("/");
}

/**
 * Reads the first non-empty line and returns the TARGET relative path.
 * @param {string} fileText Full template file contents.
 * @param {string} templatePath Absolute path (for error messages).
 * @returns {string} Raw TARGET path string from the comment (before normalization).
 */
function parseTargetFromFirstLine(fileText, templatePath) {
  const lines = fileText.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") {
    i += 1;
  }
  if (i >= lines.length) {
    throw new Error(`Template file is empty: ${templatePath}`);
  }
  const first = lines[i].trim();
  const m = first.match(TARGET_COMMENT_REGEX);
  if (!m) {
    throw new Error(
      `First non-empty line must be <!-- TARGET: ui/.../file.xml --> in: ${templatePath}\nGot: ${first}`
    );
  }
  return m[1];
}

/**
 * @param {string} xml
 * @returns {RegExpMatchArray[]}
 */
function tokenizeTags(xml) {
  const tagRegex = /<\s*\/?\s*[A-Za-z_][\w:.-]*\b[^>]*?\/?\s*>/g;
  const tokens = [];
  let m = tagRegex.exec(xml);
  while (m) {
    tokens.push({ text: m[0], index: m.index });
    m = tagRegex.exec(xml);
  }
  return tokens;
}

/**
 * @param {string} xml
 * @returns {{ root: string, rootStart: number, rootEnd: number }}
 */
function extractFirstRootElement(xml) {
  const tokens = tokenizeTags(xml);
  if (tokens.length === 0) {
    throw new Error("Template XML appears to contain no tags.");
  }

  let rootToken = null;
  for (const t of tokens) {
    const text = t.text.trim();
    if (text.startsWith("</")) continue;
    if (text.startsWith("<?")) continue;
    if (text.startsWith("<!--")) continue;
    rootToken = t;
    break;
  }
  if (!rootToken) {
    throw new Error("Failed to find an opening root element in template XML.");
  }

  const rootStart = rootToken.index;

  const rootNameMatch = rootToken.text.match(/<\s*\/?\s*([A-Za-z_][\w:.-]*)\b/);
  if (!rootNameMatch) {
    throw new Error("Failed to extract root tag name.");
  }
  const rootName = rootNameMatch[1];

  const stack = [rootName];
  let rootEnd = null;

  for (let i = tokens.findIndex((t) => t.index === rootToken.index) + 1; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenText = token.text.trim();

    const isClosing = tokenText.startsWith("</");
    const isSelfClosing = tokenText.endsWith("/>") || tokenText.endsWith(" />");
    const nameMatch = tokenText.match(/<\s*\/?\s*([A-Za-z_][\w:.-]*)\b/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    if (isSelfClosing) {
      continue;
    }

    if (isClosing) {
      const top = stack[stack.length - 1];
      if (top !== name) {
        throw new Error(`Tag nesting mismatch: expected </${top}> but found </${name}>`);
      }
      stack.pop();
      if (stack.length === 0) {
        rootEnd = token.index + token.text.length;
        break;
      }
    } else {
      stack.push(name);
    }
  }

  if (rootEnd === null) {
    throw new Error("Failed to find a matching closing tag for the template root element.");
  }

  const root = xml.slice(rootStart, rootEnd);
  return { root, rootStart, rootEnd };
}

/**
 * @param {string} xml
 * @param {string} token
 * @returns {boolean}
 */
function containsToken(xml, token) {
  return xml.indexOf(token) !== -1;
}

/**
 * Builds one output file from a template: expand `@@color@@` when present, else pass-through.
 * @param {string} templatePath Absolute path to `ui/.templates/*.xml`.
 * @param {string} projectRoot Absolute project root.
 * @param {string} token Placeholder substring (default `@@color@@`).
 * @param {string[]} colors From `C.PlayerColors` in constants.
 */
function generateFromTemplateFile(templatePath, projectRoot, token, colors) {
  const templateXml = fs.readFileSync(templatePath, "utf8");
  const targetRel = validateAndNormalizeTargetPath(
    parseTargetFromFirstLine(templateXml, templatePath),
    projectRoot
  );
  const outputPath = path.join(projectRoot, ...targetRel.split("/"));

  const { root } = extractFirstRootElement(templateXml);

  const generatedParts = [];
  if (containsToken(root, token)) {
    for (const color of colors) {
      const replaced = root.split(token).join(color);
      generatedParts.push(replaced.trim());
    }
  } else {
    generatedParts.push(root.trim());
  }

  const body = generatedParts.join("\n\n") + "\n";
  if (containsToken(body, token)) {
    throw new Error(`Generation failed: token '${token}' still exists in output: ${outputPath}`);
  }

  const relTemplate = path.relative(projectRoot, templatePath).split(path.sep).join("/");
  const banner =
    `<!-- Generated file. Edit ${relTemplate} only. -->\n` +
    "<!-- Agent guidance: .dev/TTS_BUNDLING_SETUP.md; .dev/HUDs & Overlays/Player HUD Overview.md. -->\n\n";
  const finalXml = banner + body;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, finalXml, "utf8");
}

function getArgValue(flagName) {
  const idx = process.argv.indexOf(flagName);
  if (idx === -1) return null;
  if (idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

function main() {
  const projectRoot = path.resolve(__dirname, "../..");
  const constantsPath = path.join(projectRoot, "lib/constants.ttslua");

  const templateDir = getArgValue("--templateDir") || path.join(projectRoot, "ui", ".templates");
  const token = getArgValue("--token") || DEFAULT_TOKEN;

  const colors = readPlayerColorsFromConstants(constantsPath);

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory does not exist: ${templateDir}`);
  }

  const templateFiles = fs
    .readdirSync(templateDir)
    .filter((f) => f.toLowerCase().endsWith(".xml"))
    .sort();

  if (templateFiles.length === 0) {
    throw new Error(`No template XML files found in ${templateDir}`);
  }

  for (const fileName of templateFiles) {
    const templatePath = path.join(templateDir, fileName);
    generateFromTemplateFile(templatePath, projectRoot, token, colors);
    // eslint-disable-next-line no-console
    console.log(`[xml_template_generator] Generated from ${fileName}`);
  }
}

main();
