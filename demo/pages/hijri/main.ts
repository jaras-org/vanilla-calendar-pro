import { Calendar, type Options } from '@src/index';
import * as utils from '@src/utils';

import '@src/styles/index.css';

const TODAY = '2026-09-21'; // 10 Rabiʻ II 1448
const base: Options = { calendar: 'islamic-umalqura', dateToday: TODAY };

const log = (message: string) => {
  const logEl = document.getElementById('log');
  if (logEl) logEl.textContent += `${message}\n`;
};

const configs: Record<string, Options> = {
  'hijri-default': { ...base, selectedDates: [TODAY] },
  'hijri-ramadan': { ...base, selectedMonth: 8, selectedYear: 1447 },
  'hijri-wrap': { ...base, selectedMonth: 11, selectedYear: 1447 },
  'hijri-multiple': { ...base, type: 'multiple', displayMonthsCount: 2, selectedMonth: 1, selectedYear: 1448, selectionDatesMode: 'multiple-ranged' },
  'hijri-bounds': { ...base, dateMin: '2026-08-14', dateMax: '2026-11-10', selectedMonth: 3, selectedYear: 1448 },
  'hijri-year-locked': { ...base, selectionYearsMode: false, selectedMonth: 0, selectedYear: 1448 },
  'hijri-week': { ...base, type: 'week', enableWeekNumbers: true, selectedDates: [TODAY], selectedMonth: 3, selectedYear: 1448 },
  'hijri-swipe': { ...base, enableSwipe: true, animation: true, selectedMonth: 3, selectedYear: 1448 },
  'hijri-collapse': { ...base, enableCollapse: true, animation: true, selectedDates: [TODAY], selectedMonth: 3, selectedYear: 1448 },
  'hijri-ar': {
    ...base,
    locale: 'ar-SA',
    firstWeekday: 6,
    selectedWeekends: [5, 6],
    selectedDates: [TODAY],
    enableWeekNumbers: true,
    onClickWeekNumber: (_self, week, year) => log(`week ${week} ${year}`),
  },
  'hijri-month-type': { ...base, type: 'month', selectedMonth: 3, selectedYear: 1448 },
  'hijri-year-type': { ...base, type: 'year', selectedMonth: 3, selectedYear: 1448 },
  'hijri-jump': { ...base, enableJumpToSelectedDate: true, selectedDates: ['2027-02-22'] },
  'hijri-display-future': { ...base, displayDateMin: '2099-01-01' },
  'hijri-multiple-max': { ...base, type: 'multiple', displayMonthsCount: 2, dateMax: '2027-03-08', selectedMonth: 8, selectedYear: 1447 },
  'hijri-months-to-switch': { ...base, monthsToSwitch: 2, selectedMonth: 10, selectedYear: 1447 },
  'hijri-outside-hidden': { ...base, displayDatesOutside: false, selectedMonth: 3, selectedYear: 1448 },
  'hijri-switch': { dateToday: TODAY, selectedMonth: 8, selectedYear: 2026 },
  'hijri-switch-2023': { dateToday: TODAY, selectedMonth: 8, selectedYear: 2023 },
  'greg-control': { dateToday: TODAY, selectedMonth: 8, selectedYear: 2026 },
};

document.addEventListener('DOMContentLoaded', () => {
  const hijriCalendars: Record<string, Calendar> = {};

  Object.entries(configs).forEach(([id, config]) => {
    hijriCalendars[id] = new Calendar(`#${id}`, config);
    hijriCalendars[id].init();
  });

  hijriCalendars['hijri-input'] = new Calendar('#hijri-input', {
    ...base,
    inputMode: true,
    onChangeToInput(self) {
      if (!self.context.inputElement) return;
      self.context.inputElement.value = self.context.selectedDates[0] ?? '';
      if (self.context.selectedDates[0]) self.hide();
    },
  });
  hijriCalendars['hijri-input'].init();

  ['switch', 'switch-2023'].forEach((name) => {
    const calendar = hijriCalendars[`hijri-${name}`];
    const on = (suffix: string, handler: () => void) => document.getElementById(`${name}-${suffix}`)?.addEventListener('click', handler);
    on('to-hijri', () => calendar.set({ calendar: 'islamic-umalqura' }));
    on('to-gregory', () => calendar.set({ calendar: 'gregory' }));
    on('to-hijri-keep', () => calendar.set({ calendar: 'islamic-umalqura' }, { month: false, year: false }));
    on('to-gregory-keep', () => calendar.set({ calendar: 'gregory' }, { month: false, year: false }));
  });

  document.getElementById('btn-invalid')?.addEventListener('click', () => {
    ['islamic-civil', 'persian', 'foo'].forEach((calendar) => {
      try {
        new Calendar('#hijri-invalid', { calendar: calendar as never }).init();
        log(`${calendar}: no error`);
      } catch (error) {
        log((error as Error).message);
      }
    });
    try {
      hijriCalendars['greg-control'].set({ calendar: 'foo' as never });
    } catch (error) {
      log(`set: ${(error as Error).message}`);
    }
  });

  Object.assign(window, { hijriCalendars, vcUtils: utils });
});
