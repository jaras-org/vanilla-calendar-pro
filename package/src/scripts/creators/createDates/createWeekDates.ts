import { toCalendarView } from '@scripts/calendarSystem/helpers';
import createDate from '@scripts/creators/createDates/createDate';
import getDate from '@scripts/utils/getDate';
import getDateString from '@scripts/utils/getDateString';
import type { Calendar } from '@src/index';

const createWeekDates = (self: Calendar, datesEl: HTMLElement) => {
  const weekStart = getDate(self.context.displayWeekDate);
  const weekRow = document.createElement('div');
  weekRow.className = self.styles.datesRow;
  weekRow.dataset.vcDates = 'row';
  weekRow.role = 'row';

  const dateContainer = { addDate: (dateEl: HTMLElement) => weekRow.appendChild(dateEl) };

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const view = toCalendarView(self, date);
    createDate(self, view.getFullYear(), dateContainer, view.getDate(), getDateString(date), 'current');
  }

  datesEl.appendChild(weekRow);
};

export default createWeekDates;
