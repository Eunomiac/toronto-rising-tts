"use strict";
// Function Calls is an opaque handler key consumed by the runtime.
const fs = require('node:fs');
const path = require('node:path');
const { loadSnapshot, rowsOf, writeAtomic } = require('./lib/sheet_exports.js');
const ROLL_COLUMNS = {Standard:'standard', Discipline:'discipline', Willpower:'willpowerRoll', Launch:'launch', Goal:'goal'};
const STYLE_LABELS = {
  'the beast': 'theBeast',
  thebeast: 'theBeast',
  debilitation: 'debilitation',
  general: 'general',
};
const COLOR_LABELS = { white: 'white', gold: 'gold', red: 'red' };

function parseBool(raw, label, name) {
  const flag = String(raw ?? '').trim().toUpperCase();
  if (!['TRUE', 'FALSE'].includes(flag)) throw new Error(`Invalid ${label} checkbox for ${name}`);
  return flag === 'TRUE';
}

function parseDuration(raw, label, name) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error(`${name}: missing ${label}`);
  if (/^manual$/i.test(text)) return { kind: 'Manual', offset: null };
  const match = /^Session:\+(\d+)$/i.exec(text);
  if (!match) throw new Error(`${name}: invalid ${label} ${JSON.stringify(text)} (expected Session:+N or Manual)`);
  return { kind: 'EndOfSession', offset: Number(match[1]) };
}

function parseStyle(raw, name) {
  const text = String(raw ?? '').trim();
  if (!text) return 'general';
  const id = STYLE_LABELS[text.toLowerCase()];
  if (!id) throw new Error(`${name}: invalid Condition Style ${JSON.stringify(text)}`);
  return id;
}

function parseColor(raw, name) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error(`${name}: missing Condition Color`);
  const id = COLOR_LABELS[text.toLowerCase()];
  if (!id) throw new Error(`${name}: invalid Condition Color ${JSON.stringify(text)}`);
  return id;
}

function parseCondition(read, r, name, columns) {
  if (!columns.includes('Condition Title')) return null;
  const title = String(read(r, 'Condition Title') || '').trim();
  if (!title) return null;
  return {
    title,
    subtitle: String(read(r, 'Condition Subtitle') || '').trim(),
    style: parseStyle(read(r, 'Condition Style'), name),
    color: parseColor(read(r, 'Condition Color'), name),
    baseDescription: String(read(r, 'Condition Base Description') || '').trim(),
    enhancedDescription: String(read(r, 'Condition Enhanced Description') || '').trim(),
    baseDuration: parseDuration(read(r, 'Condition Base Duration'), 'Condition Base Duration', name),
    enhancedDuration: parseDuration(read(r, 'Condition Enhanced Duration'), 'Condition Enhanced Duration', name),
  };
}

function parseCards(rows) {
  const normalize = s => String(s || '').replace(/\s+/g, ' ').trim();
  const header = rows.findIndex(r => { const cells=r.map(normalize); return cells.includes('Index') && cells.includes('Name'); });
  if (header < 0) throw new Error('Cards header missing: expected Index and Name in the same row of the Cards tab');
  const columns = rows[header].map(normalize);
  if (columns.includes("DESIGN COMPLETE?")) throw new Error("Obsolete Cards export: expected Function Calls and prefiltered completed cards");
  const required = ['Index','Name','Category','Rarity','Value','Function Calls',...Object.keys(ROLL_COLUMNS)];
  for (const name of required) if (!columns.includes(name)) throw new Error(`Missing Cards column: ${name}`);
  const read = (r,name) => r[columns.indexOf(name)];
  const cards = [], ids = new Set(), names = new Set();
  for (const r of rows.slice(header + 1)) {
    if (r.every(value => String(value ?? '').trim() === '')) continue;
    // Sheets formatting exports negative numbers with a Unicode minus sign.
    const index = Number(read(r,'Index')), name = String(read(r,'Name') || '').trim(), raw = String(read(r,'Value') ?? '').trim().replace(/^\u2212/, '-');
    if (!Number.isInteger(index) || index < 1 || !name || (raw !== 'X' && !/^-?\d+$/.test(raw))) throw new Error(`Invalid completed card: ${name}`);
    if (ids.has(index) || names.has(name)) throw new Error(`Duplicate completed card: ${name}`);
    ids.add(index); names.add(name);
    const rollTypes = {};
    for (const [column,type] of Object.entries(ROLL_COLUMNS)) {
      const flag=String(read(r,column)).toUpperCase();
      if (!['TRUE','FALSE'].includes(flag)) throw new Error(`Invalid ${column} checkbox for ${name}`);
      rollTypes[type]=flag==='TRUE';
    }
    const automationKey = String(read(r,'Function Calls') || '').trim();
    if (automationKey && !/^[A-Za-z][A-Za-z0-9_]*$/.test(automationKey)) {
      throw new Error(`Invalid Function Calls key for ${name}: ${automationKey}`);
    }
    const requiresPause = columns.includes('Requires Pause')
      ? parseBool(read(r, 'Requires Pause'), 'Requires Pause', name)
      : true;
    const dashboardPrompt = columns.includes('Dashboard Prompt')
      ? parseBool(read(r, 'Dashboard Prompt'), 'Dashboard Prompt', name)
      : false;
    const condition = parseCondition(read, r, name, columns);
    cards.push({
      index,
      automationKey,
      name,
      category: String(read(r,'Category') || '').trim(),
      rarity: String(read(r,'Rarity') || '').trim(),
      value: raw === 'X' ? 'X' : Number(raw),
      rollTypes,
      requiresPause,
      dashboardPrompt,
      condition,
    });
  }
  if (!cards.length) throw new Error('No completed cards');
  return cards.sort((a,b) => a.index-b.index);
}

function renderDuration(duration) {
  if (duration.kind === 'Manual') return '{ kind = "Manual" }';
  return `{ kind = "EndOfSession", offset = ${duration.offset} }`;
}

function renderCondition(condition) {
  const quote = s => JSON.stringify(s);
  return `{ title = ${quote(condition.title)}, subtitle = ${quote(condition.subtitle)}, style = ${quote(condition.style)}, color = ${quote(condition.color)}, baseDescription = ${quote(condition.baseDescription)}, enhancedDescription = ${quote(condition.enhancedDescription)}, baseDuration = ${renderDuration(condition.baseDuration)}, enhancedDuration = ${renderDuration(condition.enhancedDuration)} }`;
}

function render(cards) {
  const quote = s => JSON.stringify(s);
  return '-- Generated by npm run complications:import. Automation keys are authored on the sheet.\nreturn {\n' + cards.map(c => {
    const parts = [
      `name = ${quote(c.name)}`,
      `category = ${quote(c.category)}`,
      `rarity = ${quote(c.rarity)}`,
    ];
    if (c.automationKey) parts.push(`automationKey = ${quote(c.automationKey)}`);
    parts.push(`value = ${typeof c.value === 'number' ? c.value : quote(c.value)}`);
    parts.push(`requiresPause = ${c.requiresPause}`);
    parts.push(`dashboardPrompt = ${c.dashboardPrompt}`);
    if (c.condition) parts.push(`condition = ${renderCondition(c.condition)}`);
    parts.push(`rollTypes = { ${Object.entries(c.rollTypes).map(([k,v])=>`${k} = ${v}`).join(', ')} }`);
    return `  [${c.index}] = { ${parts.join(', ')} },`;
  }).join('\n') + '\n}\n';
}
async function fetchCards(snapshot) {
  return parseCards(rowsOf(snapshot || await loadSnapshot(), "COMPLICATIONS"));
}
async function main() {
  const input = process.argv.indexOf('--input');
  const cards = input >= 0 ? parseCards(JSON.parse(fs.readFileSync(process.argv[input+1], 'utf8'))) : await fetchCards();
  writeAtomic(path.resolve(__dirname, '../../lib/complications_catalog.ttslua'), render(cards));
  console.log(`Imported ${cards.length} completed Complications definitions.`);
}
module.exports = {parseCards, render, fetchCards, parseDuration, parseStyle, parseColor};
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode=1; });
