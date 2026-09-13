const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

const pad2 = (value: number): string => String(value).padStart(2, "0");

export const formatClockTime12h = (hour: number, minute: number): string => {
  const wrappedHour = ((Math.floor(hour) % 24) + 24) % 24;
  const wrappedMinute = Math.min(59, Math.max(0, Math.floor(minute)));
  const suffix = wrappedHour >= 12 ? "PM" : "AM";
  const hour12 = wrappedHour % 12 === 0 ? 12 : wrappedHour % 12;
  return `${hour12}:${pad2(wrappedMinute)} ${suffix}`;
};

export const formatChronicleDate = (year: number, month: number, day: number): string => {
  const safeMonth = Math.min(12, Math.max(1, Math.floor(month)));
  const safeDay = Math.min(31, Math.max(1, Math.floor(day)));
  const weekday = WEEKDAY_NAMES[new Date(Math.floor(year), safeMonth - 1, safeDay).getDay()] ?? "Sunday";
  const monthName = MONTH_NAMES[safeMonth - 1] ?? "January";
  return `${weekday}, ${monthName} ${safeDay}, ${Math.floor(year)}`;
};

export const formatChronicleDateTime = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): { date: string; time: string } => ({
  date: formatChronicleDate(year, month, day),
  time: formatClockTime12h(hour, minute)
});
