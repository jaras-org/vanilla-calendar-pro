import { addMonths, dayToISO, getDaysInMonth, getMonthStartDay, getWeekday } from '@scripts/calendarSystem/core';
import createDate from '@scripts/creators/createDates/createDate';
import createDatePopup from '@scripts/creators/createDates/createDatePopup';
import createWeekNumbers from '@scripts/creators/createWeekNumbers';
import type { Calendar } from '@src/index';

// Builds one month column of a non-Gregorian calendar. The cells, rows and attributes are the same as
// createDates produces; only the month boundaries and the day numbers come from the active calendar.
const createCalendarDates = (self: Calendar, datesEl: HTMLElement, weekNumbersEl: HTMLElement, index: number) => {
  const { calendar, selectedYear, selectedMonth } = self.context;
  const { year, month } = addMonths(selectedYear, selectedMonth, index);
  const start = getMonthStartDay(calendar, year, month);
  const days = getDaysInMonth(calendar, year, month);
  const prevDays = start - getMonthStartDay(calendar, year, month - 1);
  const firstDayWeek = (getWeekday(start) - self.firstWeekday + 7) % 7;
  const totalWeeks = Math.ceil((firstDayWeek + days) / 7);

  const weekRows = Array.from({ length: totalWeeks }, () => {
    const weekRow = document.createElement('div');
    weekRow.className = self.styles.datesRow;
    weekRow.setAttribute('data-vc-dates', 'row');
    weekRow.setAttribute('role', 'row');
    return weekRow;
  });

  for (let cell = 0; cell < totalWeeks * 7; cell++) {
    const offset = cell - firstDayWeek;
    const monthType = offset < 0 ? 'prev' : offset < days ? 'current' : 'next';
    const dateID = monthType === 'prev' ? prevDays + offset + 1 : monthType === 'current' ? offset + 1 : offset - days + 1;
    const weekRow = weekRows[Math.floor(cell / 7)];
    createDate(self, year, { addDate: (dateEl: HTMLElement) => weekRow.appendChild(dateEl) }, dateID, dayToISO(start + offset), monthType);
  }

  weekRows.forEach((weekRow) => datesEl.appendChild(weekRow));
  createDatePopup(self, datesEl);
  createWeekNumbers(self, firstDayWeek, days, weekNumbersEl, datesEl);
};

export default createCalendarDates;
