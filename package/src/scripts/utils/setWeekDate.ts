import { toCalendarView } from '@scripts/calendarSystem/helpers';
import getDateString from '@scripts/utils/getDateString';
import setContext from '@scripts/utils/setContext';
import type { Calendar, Range } from '@src/index';

// The fourth day determines which month owns a straddling week.
const setWeekDate = (self: Calendar, weekStart: Date) => {
  const reference = new Date(weekStart);
  reference.setDate(weekStart.getDate() + 3);
  const owner = toCalendarView(self, reference);

  setContext(self, 'displayWeekDate', getDateString(weekStart));
  setContext(self, 'selectedMonth', owner.getMonth() as Range<12>);
  setContext(self, 'selectedYear', owner.getFullYear());
};

export default setWeekDate;
