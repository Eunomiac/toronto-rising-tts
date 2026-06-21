const panels = {
  Purple: {
    health: ["22 107", "34.5 107", "47 107", "59.5 107", "72 107", "84.5 107", "97 107", "109.5 107", "122 107", "134.5 107"],
    willpower: ["22 82", "34.5 82", "47 82", "59.5 82", "72 82", "84.5 82", "97 82", "109.5 82", "122 82", "134.5 82"],
    humanity: ["22 57", "34.5 57", "47 57", "59.5 57", "72 57", "84.5 57", "97 57", "109.5 57", "122 57", "134.5 57"],
    hunger: ["53.25 32", "65.75 32", "78.25 32", "90.75 32", "103.25 32"],
  },
  Pink: {
    health: ["165 107", "177.5 107", "190 107", "202.5 107", "215 107", "227.5 107", "240 107", "252.5 107", "265 107", "277.5 107"],
    willpower: ["165 82", "177.5 82", "190 82", "202.5 82", "215 82", "227.5 82", "240 82", "252.5 82", "265 82", "277.5 82"],
    humanity: ["165 57", "177.5 57", "190 57", "202.5 57", "215 57", "227.5 57", "240 57", "252.5 57", "265 57", "277.5 57"],
    hunger: ["196.25 32", "208.75 32", "221.25 32", "233.75 32", "246.25 32"],
  },
  Red: {
    health: ["308 107", "320.5 107", "333 107", "345.5 107", "358 107", "370.5 107", "383 107", "395.5 107", "408 107", "420.5 107"],
    willpower: ["308 82", "320.5 82", "333 82", "345.5 82", "358 82", "370.5 82", "383 82", "395.5 82", "408 82", "420.5 82"],
    humanity: ["308 57", "320.5 57", "333 57", "345.5 57", "358 57", "370.5 57", "383 57", "395.5 57", "408 57", "420.5 57"],
    hunger: ["339.25 32", "351.75 32", "364.25 32", "376.75 32", "389.25 32"],
  },
  Orange: {
    health: ["451 107", "463.5 107", "476 107", "488.5 107", "501 107", "513.5 107", "526 107", "538.5 107", "551 107", "563.5 107"],
    willpower: ["451 82", "463.5 82", "476 82", "488.5 82", "501 82", "513.5 82", "526 82", "538.5 82", "551 82", "563.5 82"],
    humanity: ["451 57", "463.5 57", "476 57", "488.5 57", "501 57", "513.5 57", "526 57", "538.5 57", "551 57", "563.5 57"],
    hunger: ["482.25 32", "494.75 32", "507.25 32", "519.75 32", "532.25 32"],
  },
  Brown: {
    health: ["594 107", "606.5 107", "619 107", "631.5 107", "644 107", "656.5 107", "669 107", "681.5 107", "694 107", "706.5 107"],
    willpower: ["594 82", "606.5 82", "619 82", "631.5 82", "644 82", "656.5 82", "669 82", "681.5 82", "694 82", "706.5 82"],
    humanity: ["594 57", "606.5 57", "619 57", "631.5 57", "644 57", "656.5 57", "669 57", "681.5 57", "694 57", "706.5 57"],
    hunger: ["625.25 32", "637.75 32", "650.25 32", "662.75 32", "675.25 32"],
  },
};

const standardLayers = [
  { key: "on", image: "box_white" },
  { key: "agg", image: "box_red_x" },
  { key: "sup", image: "box_grey_slash" },
];
const humanityLayers = [
  { key: "on", image: "box_white" },
  { key: "impaired", image: "box_red" },
  { key: "stain", image: "box_black" },
];
const hungerLayers = [{ key: "on", image: "box_red" }];

function emitTracker(stat, panel, coords, layers) {
  const lines = [];
  coords.forEach((xy, i) => {
    const idx = i + 1;
    for (const layer of layers) {
      lines.push(
        `      <Image id="box_${layer.key}_${stat}_${idx}_${panel}_@@color@@" image="${layer.image}" class="box box_standard" offsetXY="${xy}" />`
      );
    }
  });
  return lines;
}

const out = [];
for (const [panel, data] of Object.entries(panels)) {
  out.push(`      <!-- ${panel.toUpperCase()} panel trackers -->`);
  out.push(...emitTracker("health", panel, data.health, standardLayers));
  out.push(...emitTracker("willpower", panel, data.willpower, standardLayers));
  out.push(...emitTracker("humanity", panel, data.humanity, humanityLayers));
  out.push(...emitTracker("hunger", panel, data.hunger, hungerLayers));
  out.push("");
}

process.stdout.write(out.join("\n"));
