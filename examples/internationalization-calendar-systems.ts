import { Calendar, type Options } from 'vanilla-calendar-pro';

import 'vanilla-calendar-pro/styles/index.css';

const options: Options = {
  calendar: 'islamic-umalqura', // Hijri (Umm al-Qura)
};

const calendar = new Calendar('#calendar', options);
calendar.init();
