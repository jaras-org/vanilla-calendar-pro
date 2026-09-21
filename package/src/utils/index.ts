import {
  dayToISO,
  getCalendarParts,
  getDayParts,
  getMonthStartDay,
  isCalendarSupported as isCalendarSupportedOriginal,
  isoToDay,
} from '@scripts/calendarSystem/core';
import getDateOriginal from '@scripts/utils/getDate';
import getDateStringOriginal from '@scripts/utils/getDateString';
import errorMessages from '@scripts/utils/getErrorMessages';
import getWeekNumberOriginal from '@scripts/utils/getWeekNumber';
import parseDatesOriginal from '@scripts/utils/parseDates';
import type { CalendarDateParts, CalendarSystem, FormatDateString, WeekDayID } from '@src/types';

export const parseDates = (dates: string[]) => parseDatesOriginal(dates);

export const getDateString = (date: Date) => getDateStringOriginal(date);

export const getDate = (date: FormatDateString) => getDateOriginal(date);

export const getWeekNumber = (date: FormatDateString, weekStartDay: WeekDayID) => getWeekNumberOriginal(date, weekStartDay);

const assertCalendar = (calendar: unknown) => {
  if (!isCalendarSupportedOriginal(calendar)) throw new Error(errorMessages.incorrectCalendar(calendar));
};

/** Whether this browser can render `calendar` ('gregory' always; 'islamic-umalqura' needs Intl support). */
export const isCalendarSupported = (calendar: unknown): calendar is CalendarSystem => isCalendarSupportedOriginal(calendar);

/** A Gregorian ISO date (years 0000-9999) as { year, month (0-11), day } in `calendar`. Independent of the time zone. */
export const getCalendarDate = (date: FormatDateString, calendar: CalendarSystem = 'gregory'): CalendarDateParts => {
  assertCalendar(calendar);
  const [, y, m, d] = (typeof date === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)) || [];
  const parts = y ? getDayParts('gregory', isoToDay(date)) : null;
  if (!parts || parts.year !== +y || parts.month !== +m - 1 || parts.day !== +d) throw new Error(errorMessages.incorrectDate(date));
  return { ...getCalendarParts(calendar, date) };
};

/** The Gregorian ISO date of { year, month (0-11), day } in `calendar`. Overflowing months and days roll over like Date. */
export const getDateFromCalendar = (year: number, month: number, day: number, calendar: CalendarSystem = 'gregory'): FormatDateString => {
  assertCalendar(calendar);
  const invalid = () => new Error(errorMessages.incorrectDate(`${year}-${month}-${day}`));
  if (![year, month, day].every(Number.isInteger)) throw invalid();

  let dayNumber: number;
  try {
    dayNumber = getMonthStartDay(calendar, year, month) + day - 1;
  } catch (error) {
    if (error instanceof RangeError) throw invalid(); // Intl can't format dates that far out
    throw error;
  }
  // The result must be a 'YYYY-MM-DD' string that getCalendarDate accepts back.
  const gregorianYear = getDayParts('gregory', dayNumber).year;
  if (!(gregorianYear >= 0 && gregorianYear <= 9999)) throw invalid();
  return dayToISO(dayNumber).padStart(10, '0') as FormatDateString;
};
