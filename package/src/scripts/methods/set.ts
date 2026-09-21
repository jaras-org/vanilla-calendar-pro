import { convertCalendarOptions } from '@scripts/calendarSystem/helpers';
import { validateCalendar } from '@scripts/calendarSystem/initCalendar';
import update from '@scripts/methods/update';
import replaceProperties from '@scripts/utils/replaceProperties';
import type { Calendar, Options, Reset } from '@src/index';

const set = (self: Calendar, options: Options, resetOptions?: Partial<Reset>) => {
  if (options.calendar !== undefined) validateCalendar(options.calendar);
  const previous = { calendar: self.calendar, month: self.selectedMonth, year: self.selectedYear };
  replaceProperties(self, options);
  convertCalendarOptions(self, previous, options);
  if (self.context.isInit) update(self, resetOptions);
};

export default set;
