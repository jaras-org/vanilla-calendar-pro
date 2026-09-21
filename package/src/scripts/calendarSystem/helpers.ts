import {
  addMonths,
  convertMonth,
  dayToISO,
  getCalendarParts,
  getMonthNames,
  getMonthStartDay,
  isCalendarSupported,
  monthIndex,
} from '@scripts/calendarSystem/core';
import getDate from '@scripts/utils/getDate';
import getDateString from '@scripts/utils/getDateString';
import setContext from '@scripts/utils/setContext';
import type { Calendar, CalendarSystem, FormatDateString, Options, Range } from '@src/index';

// Instance helpers. For the Gregorian calendar each of them returns exactly what upstream used,
// so the default output stays identical.

export const isCustomCalendar = (self: Calendar) => !!self.context.calendar && self.context.calendar !== 'gregory';

// Read-only year/month/day of a date in the active calendar (no setters, so it can't be used for arithmetic)
export type CalendarView = Pick<Date, 'getFullYear' | 'getMonth' | 'getDate'>;

export const toCalendarView = (self: Calendar, date: Date | FormatDateString): CalendarView => {
  if (!isCustomCalendar(self)) return typeof date === 'string' ? getDate(date) : date;
  const { year, month, day } = getCalendarParts(self.context.calendar, typeof date === 'string' ? date : getDateString(date));
  return { getFullYear: () => year, getMonth: () => month, getDate: () => day };
};

// Local midnight of the first day of a month in the active calendar
export const getCalendarMonthStartDate = (self: Calendar, year: number, month: number) =>
  getDate(dayToISO(getMonthStartDay(self.context.calendar, year, month)));

// Extra Intl options for the date aria-labels: nothing in the Gregorian calendar, so the labels stay upstream's
export const getIntlCalendarOptions = (self: Calendar): Intl.DateTimeFormatOptions => (isCustomCalendar(self) ? { calendar: self.context.calendar } : {});

export const getCalendarColumn = (self: Calendar, index: number) =>
  isCustomCalendar(self) ? addMonths(self.context.selectedYear, self.context.selectedMonth, index) : null;

export const shiftCalendarMonth = (self: Calendar, delta: number) => {
  const { year, month } = addMonths(self.context.selectedYear, self.context.selectedMonth, delta);
  setContext(self, 'selectedMonth', month);
  setContext(self, 'selectedYear', year);
};

export const getCalendarArrowsHidden = (self: Calendar): [boolean, boolean] => {
  const { calendar, dateMin, dateMax, displayMonthsCount, selectedMonth, selectedYear } = self.context;
  const current = monthIndex(selectedYear, selectedMonth);
  const min = getCalendarParts(calendar, dateMin);
  const max = getCalendarParts(calendar, dateMax);
  let minIndex = monthIndex(min.year, min.month);
  let maxIndex = monthIndex(max.year, max.month);

  if (!self.selectionYearsMode) {
    // Stay inside the displayed year. Upstream's setFullYear trick only works for bounds on Jan 1 / Dec 31.
    const yearStart = monthIndex(Math.floor(current / 12), 0);
    minIndex = Math.max(minIndex, yearStart);
    maxIndex = Math.min(maxIndex, yearStart + 11);
  }

  return [
    !self.selectionMonthsMode || current - self.monthsToSwitch < minIndex,
    !self.selectionMonthsMode || current + self.monthsToSwitch + (displayMonthsCount - 1) > maxIndex,
  ];
};

export const setCalendarMonthNames = (self: Calendar, locale: string, capitalize: (str: string) => string) => {
  const { calendar, locale: names } = self.context;
  names.months.short.push(...getMonthNames(calendar, locale, 'short').map(capitalize));
  names.months.long.push(...getMonthNames(calendar, locale, 'long').map(capitalize));
};

export const setCalendarAttribute = (self: Calendar) => {
  if (isCustomCalendar(self)) self.context.mainElement.dataset.vcCalendar = self.context.calendar;
  else self.context.mainElement.removeAttribute('data-vc-calendar');
};

type YearMonth = { year: number; month: Range<12> };
type Conversion = { from: CalendarSystem; to: CalendarSystem; source: YearMonth; result: YearMonth };
const conversions = new WeakMap<Calendar, Partial<Record<'options' | 'visible', Conversion>>>();

// Months of two calendars don't line up, so converting a month there and back doesn't always land on the
// original one. A conversion that undoes the previous one therefore returns that one's source.
const convertCalendarMonth = (self: Calendar, kind: 'options' | 'visible', from: CalendarSystem, to: CalendarSystem, year: number, month: number) => {
  const memo = conversions.get(self) ?? {};
  const last = memo[kind];
  if (last && last.from === to && last.to === from && last.result.year === year && last.result.month === month) return { ...last.source };

  const source = addMonths(year, month);
  const result = convertMonth(from, to, source.year, source.month);
  memo[kind] = { from, to, source, result };
  conversions.set(self, memo);
  return result;
};

// reset(): the month shown after update({ month: false, year: false }) when the calendar changed
export const getVisibleMonthForReset = (self: Calendar) => {
  const { calendar: from, selectedYear, selectedMonth } = self.context;
  const to = self.calendar;
  if (!from || from === to || selectedYear === undefined || !isCalendarSupported(to)) return { year: selectedYear, month: selectedMonth };
  return convertCalendarMonth(self, 'visible', from, to, selectedYear, selectedMonth);
};

// set(): restate the configured selectedMonth/selectedYear in the new calendar, unless the same call passes both.
// A missing half is taken from today in the previous calendar.
export const convertCalendarOptions = (self: Calendar, previous: { calendar: CalendarSystem; month?: number; year?: number }, options: Options) => {
  const { calendar: from, month, year } = previous;
  const to = self.calendar;
  const hasMonth = options.selectedMonth !== undefined;
  const hasYear = options.selectedYear !== undefined;
  if (from === to || (hasMonth && hasYear) || (month === undefined && year === undefined)) return;
  if (!isCalendarSupported(from) || !isCalendarSupported(to)) return;

  const today = getCalendarParts(from, self.context.dateToday ?? getDateString(new Date()));
  const converted = convertCalendarMonth(self, 'options', from, to, year ?? today.year, month ?? today.month);
  if (!hasMonth && month !== undefined) self.selectedMonth = converted.month;
  if (!hasYear && year !== undefined) self.selectedYear = converted.year;
};
