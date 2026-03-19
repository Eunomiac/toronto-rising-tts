/**
 * XML Color Template Generator
 *
 * Purpose:
 * - Clone an XML template that contains a `@@color@@` placeholder inside its *root element*.
 * - For each known player color, generate a per-color clone with all `@@color@@` replaced.
 * - Write a stable generated XML file without any remaining `@@color@@` tokens.
 *
 * Notes / Constraints (important):
 * - This generator expects the template file to contain exactly one root element.
 * - That root element must contain `@@color@@` somewhere in its subtree.
 * - The generator extracts the root element by parsing tags with a lightweight stack.
 *   It is designed for the controlled XML fragments used in this repo.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_TOKEN = "@@color@@";
const GENERATED_SUFFIX = "_generated";

/**
 * @param {string} constantsPath
 * @returns {string[]}
 */
function readPlayerColorsFromConstants(constantsPath) {
  const constantsText = fs.readFileSync(constantsPath, "utf8");
  // Example in repo: C.PlayerColors = { "Brown", "Orange", "Red", "Pink", "Purple" }
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
 * Lightweight XML tag tokenizer. Ignores comments and processing instructions for repo templates.
 * @param {string} xml
 * @returns {RegExpMatchArray[]}
 */
function tokenizeTags(xml) {
  // Matches:
  // - <Tag ...>
  // - </Tag>
  // - <Tag ... />
  // - <Tag .../ > (with whitespace before '/>')
  // Does not attempt to validate attribute quoting beyond "no '>' inside attributes".
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
 * Extracts the first root element (first non-closing tag) as a substring.
 * Assumes the template file contains exactly one root element.
 *
 * @param {string} xml
 * @returns {{ root: string, rootStart: number, rootEnd: number }}
 */
function extractFirstRootElement(xml) {
  const tokens = tokenizeTags(xml);
  if (tokens.length === 0) {
    throw new Error("Template XML appears to contain no tags.");
  }

  // Find first opening tag (ignore closing tags and assume repo templates don't start with comments).
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

  // Walk tags and track nesting depth for root element.
  const stack = [rootName];
  let rootEnd = null;

  for (let i = tokens.findIndex((t) => t.index === rootToken.index) + 1; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenText = token.text.trim();

    // Determine tag characteristics.
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
      // For controlled templates, we expect well-formed nesting.
      if (top !== name) {
        // Keep going but treat as a hard error to prevent generating malformed XML.
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
 * @param {string} templatePath
 * @param {string} outputPath
 * @param {string} token
 * @param {string[]} colors
 */
function generateFromTemplate(templatePath, outputPath, token, colors) {
  const templateXml = fs.readFileSync(templatePath, "utf8");
  const { root } = extractFirstRootElement(templateXml);

  if (!containsToken(root, token)) {
    throw new Error(
      `Template root element does not contain token '${token}': ${path.basename(templatePath)}`
    );
  }

  const generatedParts = [];
  for (const color of colors) {
    const replaced = root.split(token).join(color);
    generatedParts.push(replaced.trim());
  }

  const finalXml = generatedParts.join("\n\n") + "\n";
  if (finalXml.indexOf(token) !== -1) {
    throw new Error(`Generation failed: token '${token}' still exists in output: ${outputPath}`);
  }

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

  const templateDir = getArgValue("--templateDir") || path.join(projectRoot, "dev/xml_templates");
  const outputDir = getArgValue("--outputDir") || path.join(projectRoot, "ui/player/generated");
  const token = getArgValue("--token") || DEFAULT_TOKEN;

  const colors = readPlayerColorsFromConstants(constantsPath);

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory does not exist: ${templateDir}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const templateFiles = fs
    .readdirSync(templateDir)
    .filter((f) => f.endsWith(".template.xml"))
    .sort();

  if (templateFiles.length === 0) {
    throw new Error(`No template files found in ${templateDir} (expected *.template.xml).`);
  }

  for (const fileName of templateFiles) {
    const templatePath = path.join(templateDir, fileName);
    const base = fileName.replace(/\.template\.xml$/, "");
    const outFileName = `${base}${GENERATED_SUFFIX}.xml`;
    const outputPath = path.join(outputDir, outFileName);
    generateFromTemplate(templatePath, outputPath, token, colors);
    // eslint-disable-next-line no-console
    console.log(`[xml_color_template_generator] Generated: ${path.relative(projectRoot, outputPath)}`);
  }
}

main();

