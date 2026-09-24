"use strict";

/**
 * Experience log display helpers (JS mirror of lib/xp_display.ttslua) for Node bake.
 */

const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = {
  2: "Twenty",
  3: "Thirty",
  4: "Forty",
  5: "Fifty",
  6: "Sixty",
  7: "Seventy",
  8: "Eighty",
  9: "Ninety",
};

const MONTHS = [
  null,
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
  "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec.",
];

function numberToWords(n) {
  n = Math.floor(Number(n) || 0);
  if (n < 0) return `Negative ${numberToWords(-n)}`;
  if (n < 20) return ONES[n] || String(n);
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (o === 0) return TENS[t] || String(n);
    return `${TENS[t] || String(t * 10)}-${ONES[o] || String(o)}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const head = `${ONES[h] || String(h)} Hundred`;
    if (rest === 0) return head;
    return `${head} ${numberToWords(rest)}`;
  }
  return String(n);
}

function sessionDisplayForNum(sessionNum) {
  const n = Math.floor(Number(sessionNum) || 0);
  if (n === 0) return "Character Creation";
  if (n < 0) return `Pre-Session ${numberToWords(-n)}`;
  return `Session ${numberToWords(n)}`;
}

/** XmlUI-safe id token: -1 → "m1", 2 → "2" */
function sessionIdToken(sessionNum) {
  const n = Math.floor(Number(sessionNum) || 0);
  if (n < 0) return `m${-n}`;
  return String(n);
}

function sessionTitleUpper(sessionDisplay, sessionNum) {
  let s = sessionDisplay;
  if (typeof s !== "string" || s === "") {
    s = sessionDisplayForNum(sessionNum || 0);
  }
  return String(s).toUpperCase();
}

function formatShortDate(unixTime) {
  const t = Number(unixTime);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t * 1000);
  if (Number.isNaN(d.getTime())) return "";
  const mon = MONTHS[d.getMonth() + 1] || String(d.getMonth() + 1);
  return `${mon} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatSummation(prevTotal, gainTotal, spendTotal) {
  const prev = Math.floor(Number(prevTotal) || 0);
  const gain = Math.floor(Number(gainTotal) || 0);
  const spend = Math.floor(Number(spendTotal) || 0);
  const parts = [`${prev} XP`];
  if (gain > 0) parts.push(`+ ${gain}`);
  if (spend > 0) parts.push(`− ${spend}`);
  return `${parts.join(" ")} =`;
}

function sessionLineCount(gainCount, spendCount) {
  const g = Math.max(0, Math.floor(Number(gainCount) || 0));
  const s = Math.max(0, Math.floor(Number(spendCount) || 0));
  return Math.min(20, 1 + Math.max(g, s));
}

const LIVE_SLOT_CAP = 10;
const PAGE_LINE_BUDGET = 20;

module.exports = {
  numberToWords,
  sessionDisplayForNum,
  sessionIdToken,
  sessionTitleUpper,
  formatShortDate,
  formatSummation,
  sessionLineCount,
  LIVE_SLOT_CAP,
  PAGE_LINE_BUDGET,
};
