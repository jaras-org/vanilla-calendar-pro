import type * as CoreModule from '../../package/src/scripts/calendarSystem/core';

type Core = typeof CoreModule;

const HIJRI = 'islamic-umalqura';

// The core module is exposed by the demo page, so it runs in the browser's own Intl.
const core = () => {
  cy.visit('/pages/calendar-system/');
  cy.get('#ready').should('have.text', 'ready');
  return cy.window().then((win) => (win as unknown as { calendarSystemCore: Core }).calendarSystemCore);
};

describe('Calendar system core', () => {
  it('runs in the time zone the suite was started with', () => {
    const tz = Cypress.env('TZ') as string | undefined;
    if (!tz) return;
    cy.window().then((win) => expect(win.Intl.DateTimeFormat().resolvedOptions().timeZone).to.equal(tz));
  });

  it('knows which calendars it supports', () => {
    core().then((c) => {
      expect(c.isCalendarSupported('gregory')).to.equal(true);
      expect(c.isCalendarSupported(HIJRI)).to.equal(true);
      ['islamic-civil', 'islamic-tbla', 'persian', 'foo', 'x', '', undefined, 1].forEach((id) => expect(c.isCalendarSupported(id), String(id)).to.equal(false));
    });
  });

  it('converts Gregorian ISO dates to Umm al-Qura parts', () => {
    core().then((c) => {
      expect(c.getCalendarParts(HIJRI, '2026-09-21')).to.deep.equal({ year: 1448, month: 3, day: 10 });
      expect(c.getCalendarParts('gregory', '2026-09-21')).to.deep.equal({ year: 2026, month: 8, day: 21 });
      expect(c.getCalendarParts(HIJRI, '2027-02-22')).to.deep.equal({ year: 1448, month: 8, day: 15 });
    });
  });

  it('finds the first day of Umm al-Qura months', () => {
    core().then((c) => {
      const start = (y: number, m: number) => c.dayToISO(c.getMonthStartDay(HIJRI, y, m));
      expect(start(1448, 0)).to.equal('2026-06-16');
      expect(start(1447, 8)).to.equal('2026-02-18');
      expect(start(1448, 3)).to.equal('2026-09-12');
      expect(start(1449, 0)).to.equal('2027-06-06');
      expect(start(1448, -1)).to.equal('2026-05-18');
      expect(start(1447, 12)).to.equal('2026-06-16');
      expect(c.getDateFromParts(HIJRI, 1448, 8, 30)).to.equal('2027-03-09'); // Ramadan 1448 has 29 days: rolls into Shawwal
      expect(c.getDateFromParts('gregory', 2024, 1, 30)).to.equal('2024-03-01');
      expect(c.getDateFromParts('gregory', 2024, -1, 1)).to.equal('2023-12-01');
    });
  });

  it('gets the month lengths of 1447 and 1448 AH', () => {
    core().then((c) => {
      const lengths = (y: number) => Array.from({ length: 12 }, (_, m) => c.getDaysInMonth(HIJRI, y, m));
      expect(lengths(1447)).to.deep.equal([30, 29, 30, 30, 30, 29, 30, 29, 30, 29, 30, 29]);
      expect(lengths(1448)).to.deep.equal([29, 30, 29, 30, 30, 29, 30, 30, 29, 30, 29, 30]);
    });
  });

  it('round-trips every day from 2020 to 2030', () => {
    core().then((c) => {
      const failures: string[] = [];
      for (let day = c.isoToDay('2020-01-01'); day <= c.isoToDay('2030-12-31'); day++) {
        const iso = c.dayToISO(day);
        const parts = c.getCalendarParts(HIJRI, iso);
        if (c.getDateFromParts(HIJRI, parts.year, parts.month, parts.day) !== iso) failures.push(iso);
      }
      expect(failures).to.deep.equal([]);
    });
  });

  it('stays continuous across the edges of the Umm al-Qura table', () => {
    core().then((c) => {
      expect(c.getCalendarParts(HIJRI, '1882-11-11')).to.deep.equal({ year: 1299, month: 11, day: 29 });
      expect(c.getCalendarParts(HIJRI, '1882-11-12')).to.deep.equal({ year: 1300, month: 0, day: 1 });
      expect(c.getCalendarParts(HIJRI, '2174-11-25')).to.deep.equal({ year: 1600, month: 11, day: 30 });
      expect(c.getCalendarParts(HIJRI, '2174-11-26')).to.deep.equal({ year: 1601, month: 0, day: 1 });
      // The library's default bounds
      expect(c.getCalendarParts(HIJRI, '1970-01-01')).to.deep.equal({ year: 1389, month: 9, day: 22 });
      expect(c.getCalendarParts(HIJRI, '2470-12-31')).to.deep.equal({ year: 1906, month: 2, day: 8 });
    });
  });

  it('normalises month arithmetic like Date overflow', () => {
    core().then((c) => {
      expect(c.addMonths(1448, -1)).to.deep.equal({ year: 1447, month: 11 });
      expect(c.addMonths(1447, 12)).to.deep.equal({ year: 1448, month: 0 });
      expect(c.addMonths(1448, 3, -16)).to.deep.equal({ year: 1446, month: 11 });
      expect(c.addMonths(1448, 3, 9)).to.deep.equal({ year: 1449, month: 0 });
    });
  });

  it('converts a month through the day-15 rule', () => {
    core().then((c) => {
      expect(c.convertMonth('gregory', HIJRI, 2026, 8)).to.deep.equal({ year: 1448, month: 3 });
      expect(c.convertMonth(HIJRI, 'gregory', 1448, 3)).to.deep.equal({ year: 2026, month: 8 });
    });
  });

  it('names every Umm al-Qura month once, from real month dates', () => {
    core().then((c) => {
      cy.window().then((win) => {
        const names = c.getMonthNames(HIJRI, 'en', 'long');
        expect(new Set(names).size).to.equal(12);
        const expected = new win.Intl.DateTimeFormat('en', { calendar: HIJRI, month: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 8, 21));
        expect(names[3]).to.equal(expected);
      });
    });
  });
});
