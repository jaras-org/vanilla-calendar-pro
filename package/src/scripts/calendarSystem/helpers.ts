import { addMonths, dayToISO, getCalendarParts, getMonthNames, getMonthStartDay, monthIndex } from '@scripts/calendarSystem/core';
import getDate from '@scripts/utils/getDate';
import getDateString from '@scripts/utils/getDateString';
import setContext from '@scripts/utils/setContext';
import type { Calendar, FormatDateString } from '@src/index';

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
