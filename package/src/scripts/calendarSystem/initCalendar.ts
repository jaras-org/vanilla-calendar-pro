import { isCalendarSupported } from '@scripts/calendarSystem/core';
import errorMessages from '@scripts/utils/getErrorMessages';
import setContext from '@scripts/utils/setContext';
import type { Calendar } from '@src/index';

export const validateCalendar = (calendar: unknown) => {
  if (!isCalendarSupported(calendar)) throw new Error(errorMessages.incorrectCalendar(calendar));
};

const initCalendar = (self: Calendar) => {
  validateCalendar(self.calendar);
  // Cached month names belong to one calendar.
  if (self.context.calendar && self.context.calendar !== self.calendar) {
    setContext(self, 'locale', { months: { short: [], long: [] }, weekdays: { short: [], long: [] } });
  }
  setContext(self, 'calendar', self.calendar);
};

export default initCalendar;
