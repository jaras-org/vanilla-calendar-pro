import { Calendar, type Options } from 'vanilla-calendar-pro';

import 'vanilla-calendar-pro/styles/index.css';

const options: Options = {
  calendar: 'islamic-umalqura',
  locale: 'ar-SA',
  firstWeekday: 6, // Saturday
  selectedWeekends: [5, 6], // Friday and Saturday
};

const calendar = new Calendar('#calendar', options);
calendar.init();
