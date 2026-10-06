/** Experience Log display helpers (TS port of `lib/xp_display.ttslua` / `.dev/scripts/xp_display.js`). */

const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const TENS: Record<number, string> = {
  2: "Twenty", 3: "Thirty", 4: "Forty", 5: "Fifty", 6: "Sixty", 7: "Seventy", 8: "Eighty", 9: "Ninety"
};

const MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

export const numberToWords = (value: number): string => {
  const n = Math.floor(value);
  if (n < 0) {
    return `Negative ${numberToWords(-n)}`;
  }
  if (n < 20) {
    return ONES[n] ?? String(n);
  }
  if (n < 100) {
    const tens = TENS[Math.floor(n / 10)] ?? String(n - (n % 10));
    const ones = n % 10;
    return ones === 0 ? tens : `${tens}-${ONES[ones] ?? String(ones)}`;
  }
  if (n < 1000) {
    const head = `${ONES[Math.floor(n / 100)] ?? String(Math.floor(n / 100))} Hundred`;
    const rest = n % 100;
    return rest === 0 ? head : `${head} ${numberToWords(rest)}`;
  }
  return String(n);
};

export const sessionDisplayForNum = (sessionNum: number): string => {
  const n = Math.floor(sessionNum);
  if (n === 0) {
    return "Character Creation";
  }
  return n < 0 ? `Pre-Session ${numberToWords(-n)}` : `Session ${numberToWords(n)}`;
};

export const sessionTitleUpper = (sessionDisplay: string, sessionNum: number): string =>
  (sessionDisplay !== "" ? sessionDisplay : sessionDisplayForNum(sessionNum)).toUpperCase();

/** `os.time()` seconds → "Oct. 6, 2026" (local time, like the TTS bake). */
export const formatShortDate = (unixSeconds?: number): string => {
  if (unixSeconds === undefined || !Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return "";
  }
  const date = new Date(unixSeconds * 1000);
  return `${MONTHS[date.getMonth()] ?? ""} ${date.getDate()}, ${date.getFullYear()}`;
};

/** "12 XP + 3 − 5 =" (the line before the session's new total). */
export const formatSummation = (prevTotal: number, gainTotal: number, spendTotal: number): string => {
  const parts = [`${Math.floor(prevTotal)} XP`];
  if (gainTotal > 0) {
    parts.push(`+ ${Math.floor(gainTotal)}`);
  }
  if (spendTotal > 0) {
    parts.push(`− ${Math.floor(spendTotal)}`);
  }
  return `${parts.join(" ")} =`;
};
