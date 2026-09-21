import setContext from '@scripts/utils/setContext';
import type { Calendar } from '@src/index';

const initCalendar = (self: Calendar) => {
  setContext(self, 'calendar', 'gregory');
};

export default initCalendar;
