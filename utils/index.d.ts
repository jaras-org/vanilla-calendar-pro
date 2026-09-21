import { CalendarDateParts, CalendarSystem, FormatDateString, WeekDayID } from '../types';
export declare const parseDates: (dates: string[]) => (`${number}-0${number}-0${number}` | `${number}-0${number}-1${number}` | `${number}-0${number}-2${number}` | `${number}-0${number}-30` | `${number}-0${number}-31` | `${number}-10-0${number}` | `${number}-10-1${number}` | `${number}-10-2${number}` | `${number}-10-30` | `${number}-10-31` | `${number}-11-0${number}` | `${number}-11-1${number}` | `${number}-11-2${number}` | `${number}-11-30` | `${number}-11-31` | `${number}-12-0${number}` | `${number}-12-1${number}` | `${number}-12-2${number}` | `${number}-12-30` | `${number}-12-31`)[];
export declare const getDateString: (date: Date) => `${number}-0${number}-0${number}` | `${number}-0${number}-1${number}` | `${number}-0${number}-2${number}` | `${number}-0${number}-30` | `${number}-0${number}-31` | `${number}-10-0${number}` | `${number}-10-1${number}` | `${number}-10-2${number}` | `${number}-10-30` | `${number}-10-31` | `${number}-11-0${number}` | `${number}-11-1${number}` | `${number}-11-2${number}` | `${number}-11-30` | `${number}-11-31` | `${number}-12-0${number}` | `${number}-12-1${number}` | `${number}-12-2${number}` | `${number}-12-30` | `${number}-12-31`;
export declare const getDate: (date: FormatDateString) => Date;
export declare const getWeekNumber: (date: FormatDateString, weekStartDay: WeekDayID) => {
    year: number;
    week: number;
};
/** Whether this browser can render `calendar` ('gregory' always; 'islamic-umalqura' needs Intl support). */
export declare const isCalendarSupported: (calendar: unknown) => calendar is CalendarSystem;
/** A Gregorian ISO date (years 0000-9999) as { year, month (0-11), day } in `calendar`. Independent of the time zone. */
export declare const getCalendarDate: (date: FormatDateString, calendar?: CalendarSystem) => CalendarDateParts;
/** The Gregorian ISO date of { year, month (0-11), day } in `calendar`. Overflowing months and days roll over like Date. */
export declare const getDateFromCalendar: (year: number, month: number, day: number, calendar?: CalendarSystem) => FormatDateString;
