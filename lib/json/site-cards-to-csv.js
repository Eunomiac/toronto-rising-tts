const fs = require("fs");
const path = require("path");

const input = path.join(__dirname, "Site Cards.json");
const output = path.join(__dirname, "Site Cards.csv");

const data = JSON.parse(fs.readFileSync(input, "utf8"));

function escapeCsv(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const lines = ["Name,URL"];
for (const row of data) {
  lines.push(`${escapeCsv(row.Name)},${escapeCsv(row.URL)}`);
}

fs.writeFileSync(output, lines.join("\n") + "\n", "utf8");
console.log(`Wrote ${data.length} rows to ${output}`);
