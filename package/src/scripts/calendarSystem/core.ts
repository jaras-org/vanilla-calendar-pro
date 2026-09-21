import errorMessages from '@scripts/utils/getErrorMessages';
import type { CalendarDateParts, CalendarSystem, FormatDateString, Range } from '@src/types';

// Calendar arithmetic that does not depend on a calendar instance, shared by the main and utils bundles.
// Days are counted in UTC from 1970-01-01, so the results do not depend on the time zone.

export const CALENDAR_SYSTEMS: readonly CalendarSystem[] = ['gregory', 'islamic-umalqura'];

const DAY_MS = 86400000;
const MEAN_MONTH_DAYS = 29.530588853;
const NAMES_REFERENCE_YEAR = 1447;

export const monthIndex = (year: number, month: number) => year * 12 + month;

// Same normalisation as Date#setMonth overflow: (1448, -1) -> (1447, 11), (1447, 12) -> (1448, 0)
export const addMonths = (year: number, month: number, delta = 0) => {
  const index = monthIndex(year, month) + delta;
  const normalizedYear = Math.floor(index / 12);
  return { year: normalizedYear, month: (index - normalizedYear * 12) as Range<12> };
};

export const isoToDay = (date: FormatDateString) => {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day); // Date.UTC would map the years 0-99 to 19xx
  return Math.floor(utc.getTime() / DAY_MS);
};

// Same shape as getDateString (the year is not padded), not toISOString
export const dayToISO = (day: number) => {
  const utc = new Date(day * DAY_MS);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}` as FormatDateString;
};

// 1970-01-01 was a Thursday
export const getWeekday = (day: number) => (((day + 4) % 7) + 7) % 7;

const supportCache = new Map<string, boolean>();

export const isCalendarSupported = (calendar: unknown): calendar is CalendarSystem => {
  if (calendar === 'gregory') return true;
  if (typeof calendar !== 'string' || !CALENDAR_SYSTEMS.includes(calendar as CalendarSystem)) return false;

  let isSupported = supportCache.get(calendar);
  if (isSupported === undefined) {
    try {
      // Unknown ids silently resolve to 'gregory', so the resolved calendar has to be compared.
      isSupported =
        typeof Intl.DateTimeFormat.prototype.formatToParts === 'function' &&
        new Intl.DateTimeFormat('en-US', { calendar, timeZone: 'UTC' }).resolvedOptions().calendar === calendar;
    } catch {
      isSupported = false;
    }
    supportCache.set(calendar, isSupported);
  }
  return isSupported;
};

const partsFormatters = new Map<CalendarSystem, Intl.DateTimeFormat>();
const partsCache = new Map<string, CalendarDateParts>();

export const getDayParts = (calendar: CalendarSystem, day: number): CalendarDateParts => {
  if (calendar === 'gregory') {
    const utc = new Date(day * DAY_MS);
    return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() as Range<12>, day: utc.getUTCDate() };
  }

  const key = `${calendar}:${day}`;
  const cached = partsCache.get(key);
  if (cached) return cached;

  let formatter = partsFormatters.get(calendar);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { calendar, numberingSystem: 'latn', timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
    partsFormatters.set(calendar, formatter);
  }

  const values = { year: NaN, month: NaN, day: NaN };
  // Parts are picked by type: their order depends on the locale, and an 'era' part is always added.
  formatter.formatToParts(day * DAY_MS).forEach(({ type, value }) => {
    if (type === 'year' || type === 'month' || type === 'day') values[type] = parseInt(value, 10);
  });
  if (Number.isNaN(values.year + values.month + values.day)) throw new Error(errorMessages.incorrectCalendar(calendar));

  const parts: CalendarDateParts = { year: values.year, month: (values.month - 1) as Range<12>, day: values.day };
  if (partsCache.size >= 4096) partsCache.clear();
  partsCache.set(key, parts);
  return parts;
};

export const getCalendarParts = (calendar: CalendarSystem, date: FormatDateString) => getDayParts(calendar, isoToDay(date));

// Tabular Islamic arithmetic (civil, Friday epoch) in UTC day numbers. It is only the starting point of the
// search below: Intl's Umm al-Qura table never differs from it by more than a couple of days.
const estimateIslamicMonthStart = (year: number, month: number) => Math.ceil(29.5 * month) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) - 492148;

const monthStartCache = new Map<string, number>();

export const getMonthStartDay = (calendar: CalendarSystem, year: number, month: number): number => {
  const target = addMonths(year, month);

  if (calendar === 'gregory') {
    const utc = new Date(0);
    utc.setUTCFullYear(target.year, target.month, 1);
    return Math.floor(utc.getTime() / DAY_MS);
  }

  const key = `${calendar}:${target.year}:${target.month}`;
  const cached = monthStartCache.get(key);
  if (cached !== undefined) return cached;

  const targetIndex = monthIndex(target.year, target.month);
  let day = estimateIslamicMonthStart(target.year, target.month);

  for (let attempt = 0; attempt < 8; attempt++) {
    const parts = getDayParts(calendar, day);
    const monthsOff = targetIndex - monthIndex(parts.year, parts.month);
    if (monthsOff === 0 && parts.day === 1) {
      monthStartCache.set(key, day);
      return day;
    }
    // Jump whole months, then snap to the first day.
    day += Math.round(monthsOff * MEAN_MONTH_DAYS) + 1 - parts.day;
  }

  // Never render a silently wrong grid.
  throw new Error(errorMessages.incorrectCalendar(calendar));
};

export const getDaysInMonth = (calendar: CalendarSystem, year: number, month: number) =>
  getMonthStartDay(calendar, year, month + 1) - getMonthStartDay(calendar, year, month);

export const getDateFromParts = (calendar: CalendarSystem, year: number, month: number, day: number) =>
  dayToISO(getMonthStartDay(calendar, year, month) + day - 1);

// The month of the target calendar that contains day 15 of the source month (Sep 2026 -> Rabiʻ II 1448)
export const convertMonth = (from: CalendarSystem, to: CalendarSystem, year: number, month: number) => {
  const parts = getDayParts(to, getMonthStartDay(from, year, month) + 14);
  return { year: parts.year, month: parts.month };
};

// Month names are taken from the middle of real months, so every name belongs to its own month.
export const getMonthNames = (calendar: CalendarSystem, locale: string, width: 'long' | 'short') => {
  const formatter = new Intl.DateTimeFormat(locale, { calendar, month: width, timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, i) => formatter.format((getMonthStartDay(calendar, NAMES_REFERENCE_YEAR, i) + 14) * DAY_MS));
};
