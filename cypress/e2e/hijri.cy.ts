import type { Calendar } from '../../package/src';
import type * as UtilsModule from '../../package/src/utils';

type DemoWindow = { hijriCalendars: Record<string, Calendar>; vcUtils: typeof UtilsModule };

const HIJRI = 'islamic-umalqura';
const TODAY = '2026-09-21';

const visit = () => cy.visit('/pages/hijri/');
const demo = () => cy.window().then((win) => win as unknown as DemoWindow & typeof globalThis);
const calendarOf = (id: string) => demo().then((win) => win.hijriCalendars[id]);

const settled = (id: string) => cy.get(`${id} [data-vc-ghost]`).should('not.exist');

const cellSelector = (month?: 'prev' | 'current' | 'next') => (month ? `[data-vc-date][data-vc-date-month="${month}"]` : '[data-vc-date]');

const isosOf = (id: string, month?: 'prev' | 'current' | 'next') => {
  settled(id);
  return cy.get(id).then(($root) => Array.from($root[0].querySelectorAll<HTMLElement>(cellSelector(month))).map((el) => el.dataset.vcDate));
};

const labelsOf = (id: string, month?: 'prev' | 'current' | 'next') => {
  settled(id);
  return cy
    .get(id)
    .then(($root) =>
      Array.from($root[0].querySelectorAll<HTMLElement>(cellSelector(month))).map((el) => el.querySelector('[data-vc-date-btn]')?.textContent ?? ''),
    );
};

const monthsOf = (id: string) => {
  settled(id);
  return cy.get(`${id} [data-vc="month"]`).then(($els) => Cypress._.map($els, (el: HTMLElement) => el.dataset.vcMonth));
};

const yearsOf = (id: string) => {
  settled(id);
  return cy.get(`${id} [data-vc="year"]`).then(($els) => Cypress._.map($els, (el: HTMLElement) => el.dataset.vcYear));
};

const arrow = (id: string, route: 'prev' | 'next') => cy.get(`${id} [data-vc-arrow="${route}"]`);
const next = (id: string, times = 1) => Cypress._.times(times, () => arrow(id, 'next').click());
const prev = (id: string, times = 1) => Cypress._.times(times, () => arrow(id, 'prev').click());

const numbers = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

const isoDays = (start: string, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const [y, m, d] = start.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
  });

// Swipe helpers, as in swipe.cy.ts
const surface = (id: string) => cy.get(`${id} [data-vc="content"]`).first();
const pointer = { pointerId: 1, isPrimary: true, button: 0, eventConstructor: 'PointerEvent', force: true } as const;
const swipe = (id: string, dx: number) => {
  surface(id).then(($el) => {
    const box = $el[0].getBoundingClientRect();
    const x = Math.round(box.left + box.width / 2);
    const y = Math.round(box.top + box.height / 2);
    cy.wrap($el).trigger('pointerdown', { ...pointer, clientX: x, clientY: y });
    cy.wrap($el).trigger('pointermove', { ...pointer, clientX: x + Math.sign(dx) * 12, clientY: y });
    cy.wrap($el).trigger('pointermove', { ...pointer, clientX: x + dx, clientY: y });
    cy.wait(250);
    cy.wrap($el).trigger('pointerup', { ...pointer, clientX: x + dx, clientY: y });
  });
};

describe('Hijri (Umm al-Qura) calendar', () => {
  it('renders Rabiʻ II 1448 around today', () => {
    visit();
    cy.get('#hijri-default').should('have.attr', 'data-vc-calendar', HIJRI);
    monthsOf('#hijri-default').should('deep.equal', ['3']);
    yearsOf('#hijri-default').should('deep.equal', ['1448']);
    cy.get('#hijri-default [data-vc="year"]').should('have.text', '1448');
    demo().then((win) => {
      const name = new win.Intl.DateTimeFormat('en', { calendar: HIJRI, month: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 8, 21));
      cy.get('#hijri-default [data-vc="month"]').should('have.text', name);
    });

    cy.get('#hijri-default [data-vc-dates="row"]').should('have.length', 5);
    isosOf('#hijri-default').should('have.length', 35);
    isosOf('#hijri-default', 'prev').should('deep.equal', isoDays('2026-09-07', 5));
    labelsOf('#hijri-default', 'prev').should('deep.equal', numbers(25, 29));
    isosOf('#hijri-default', 'current').should('deep.equal', isoDays('2026-09-12', 30));
    labelsOf('#hijri-default', 'current').should('deep.equal', numbers(1, 30));
    isosOf('#hijri-default', 'next').should('deep.equal', []);
  });

  it('marks today, selects ISO dates and labels them in the Hijri calendar', () => {
    visit();
    cy.get(`#hijri-default [data-vc-date="${TODAY}"]`).should('have.attr', 'data-vc-date-today');
    cy.get(`#hijri-default [data-vc-date="${TODAY}"]`).should('have.attr', 'data-vc-date-selected');
    cy.get(`#hijri-default [data-vc-date="${TODAY}"] [data-vc-date-btn]`).should('have.text', '10');
    demo().then((win) => {
      const label = new win.Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC', calendar: HIJRI }).format(Date.UTC(2026, 8, 21));
      cy.get(`#hijri-default [data-vc-date="${TODAY}"] [data-vc-date-btn]`).should('have.attr', 'aria-label', label);
    });

    cy.get('#hijri-default [data-vc-date="2026-09-26"] [data-vc-date-btn]').click();
    calendarOf('hijri-default').then((cal) => expect(cal.context.selectedDates).to.deep.equal(['2026-09-26']));

    cy.get('#hijri-default [data-vc-date="2026-09-07"] [data-vc-date-btn]').click();
    monthsOf('#hijri-default').should('deep.equal', ['2']);
    isosOf('#hijri-default', 'current').should('deep.equal', isoDays('2026-08-14', 29));
  });

  it('lays out Ramadan 1447 with fillers from Shaʻban and Shawwal', () => {
    visit();
    isosOf('#hijri-ramadan', 'prev').should('deep.equal', ['2026-02-16', '2026-02-17']);
    labelsOf('#hijri-ramadan', 'prev').should('deep.equal', ['28', '29']);
    isosOf('#hijri-ramadan', 'current').should('deep.equal', isoDays('2026-02-18', 30));
    isosOf('#hijri-ramadan', 'next').should('deep.equal', ['2026-03-20', '2026-03-21', '2026-03-22']);
    labelsOf('#hijri-ramadan', 'next').should('deep.equal', ['1', '2', '3']);
  });

  it('wraps the year and follows the real month lengths', () => {
    visit();
    isosOf('#hijri-wrap', 'current').should('deep.equal', isoDays('2026-05-18', 29));

    next('#hijri-wrap');
    monthsOf('#hijri-wrap').should('deep.equal', ['0']);
    yearsOf('#hijri-wrap').should('deep.equal', ['1448']);
    isosOf('#hijri-wrap', 'current').then((isos) => expect(isos[0]).to.equal('2026-06-16'));

    const lengths: number[] = [];
    [29, 30, 29, 30, 30, 29, 30, 30, 29, 30, 29, 30].forEach((length, month) => {
      if (month) next('#hijri-wrap');
      isosOf('#hijri-wrap', 'current').then((isos) => lengths.push(isos.length));
    });
    cy.wrap(lengths).should('deep.equal', [29, 30, 29, 30, 30, 29, 30, 30, 29, 30, 29, 30]);

    next('#hijri-wrap');
    monthsOf('#hijri-wrap').should('deep.equal', ['0']);
    yearsOf('#hijri-wrap').should('deep.equal', ['1449']);
    isosOf('#hijri-wrap', 'current').then((isos) => expect(isos[0]).to.equal('2027-06-06'));
  });

  it('steps back across the year', () => {
    visit();
    prev('#hijri-wrap');
    monthsOf('#hijri-wrap').should('deep.equal', ['10']);
    yearsOf('#hijri-wrap').should('deep.equal', ['1447']);
  });

  it('titles and fills the columns of a multiple calendar', () => {
    visit();
    monthsOf('#hijri-multiple').should('deep.equal', ['1', '2']);
    yearsOf('#hijri-multiple').should('deep.equal', ['1448', '1448']);

    prev('#hijri-multiple', 2);
    monthsOf('#hijri-multiple').should('deep.equal', ['11', '0']);
    yearsOf('#hijri-multiple').should('deep.equal', ['1447', '1448']);
    cy.get('#hijri-multiple [data-vc="column"]').then(($columns) => {
      const firstCurrent = Cypress._.map(
        $columns,
        (column: HTMLElement) => column.querySelector<HTMLElement>('[data-vc-date-month="current"]')?.dataset.vcDate,
      );
      expect(firstCurrent).to.deep.equal(['2026-05-18', '2026-06-16']);
    });
  });

  it('normalises a month picked in the second column', () => {
    visit();
    cy.get('#hijri-multiple [data-vc="month"]').eq(1).click();
    cy.get('#hijri-multiple [data-vc-months-month="0"]').click();
    monthsOf('#hijri-multiple').should('deep.equal', ['11', '0']);
    yearsOf('#hijri-multiple').should('deep.equal', ['1447', '1448']);
    calendarOf('hijri-multiple').then((cal) => {
      expect(cal.context.selectedMonth).to.equal(11);
      expect(cal.context.selectedYear).to.equal(1447);
    });
  });

  it('picks a year in a column that has wrapped into the next year', () => {
    visit();
    prev('#hijri-multiple', 2);
    cy.get('#hijri-multiple [data-vc="year"]').eq(1).click();
    cy.get('#hijri-multiple [data-vc-years-year="1450"]').click();
    yearsOf('#hijri-multiple').should('deep.equal', ['1449', '1450']);
    monthsOf('#hijri-multiple').should('deep.equal', ['11', '0']);
  });

  it('clamps a year picked beyond dateMax in a multiple calendar', () => {
    visit();
    monthsOf('#hijri-multiple-max').should('deep.equal', ['8', '9']);
    cy.get('#hijri-multiple-max [data-vc="year"]').first().click();
    cy.get('#hijri-multiple-max [data-vc-years-year="1448"]').click();
    monthsOf('#hijri-multiple-max').should('deep.equal', ['7', '8']);
    yearsOf('#hijri-multiple-max').should('deep.equal', ['1448', '1448']);
    calendarOf('hijri-multiple-max').then((cal) => expect(cal.context.selectedMonth).to.equal(7));
  });

  it('hides the arrows at dateMin and dateMax', () => {
    visit();
    arrow('#hijri-bounds', 'prev').should('not.have.css', 'visibility', 'hidden');
    arrow('#hijri-bounds', 'next').should('not.have.css', 'visibility', 'hidden');

    prev('#hijri-bounds');
    monthsOf('#hijri-bounds').should('deep.equal', ['2']);
    arrow('#hijri-bounds', 'prev').should('have.css', 'visibility', 'hidden');
    cy.get('#hijri-bounds [data-vc-date="2026-08-13"]').should('have.attr', 'data-vc-date-disabled');
    cy.get('#hijri-bounds [data-vc-date="2026-08-14"]').should('not.have.attr', 'data-vc-date-disabled');

    next('#hijri-bounds', 2);
    monthsOf('#hijri-bounds').should('deep.equal', ['4']);
    arrow('#hijri-bounds', 'next').should('have.css', 'visibility', 'hidden');
    cy.get('#hijri-bounds [data-vc-date="2026-11-10"]').should('not.have.attr', 'data-vc-date-disabled');
    cy.get('#hijri-bounds [data-vc-date="2026-11-11"]').should('have.attr', 'data-vc-date-disabled');
  });

  it('limits the month and year pickers to the bounds', () => {
    visit();
    cy.get('#hijri-bounds [data-vc="month"]').click();
    cy.get('#hijri-bounds [data-vc-months-month]').then(($months) => {
      const enabled = Array.from($months as JQuery<HTMLButtonElement>)
        .filter((el) => !el.disabled)
        .map((el) => el.dataset.vcMonthsMonth);
      expect(enabled).to.deep.equal(['2', '3', '4']);
    });

    visit();
    cy.get('#hijri-bounds [data-vc="year"]').click();
    cy.get('#hijri-bounds [data-vc-years-year]').then(($years) => {
      const enabled = Array.from($years as JQuery<HTMLButtonElement>)
        .filter((el) => !el.disabled)
        .map((el) => el.dataset.vcYearsYear);
      expect(enabled).to.deep.equal(['1448']);
    });
    arrow('#hijri-bounds', 'prev').should('have.css', 'visibility', 'hidden');
    arrow('#hijri-bounds', 'next').should('have.css', 'visibility', 'hidden');
  });

  it('keeps navigation inside the Hijri year when year selection is off', () => {
    visit();
    arrow('#hijri-year-locked', 'prev').should('have.css', 'visibility', 'hidden');
    arrow('#hijri-year-locked', 'next').should('not.have.css', 'visibility', 'hidden');
    cy.get('#hijri-year-locked [data-vc-date="2026-06-15"]').should('have.attr', 'data-vc-date-disabled');

    next('#hijri-year-locked', 5);
    monthsOf('#hijri-year-locked').should('deep.equal', ['5']);
    arrow('#hijri-year-locked', 'prev').should('not.have.css', 'visibility', 'hidden');
    arrow('#hijri-year-locked', 'next').should('not.have.css', 'visibility', 'hidden');

    next('#hijri-year-locked', 6);
    monthsOf('#hijri-year-locked').should('deep.equal', ['11']);
    yearsOf('#hijri-year-locked').should('deep.equal', ['1448']);
    arrow('#hijri-year-locked', 'next').should('have.css', 'visibility', 'hidden');
  });

  it('pages the year picker by fifteen Hijri years', () => {
    visit();
    const years = () => cy.get('#hijri-default [data-vc-years-year]').then(($years) => Cypress._.map($years, (el: HTMLElement) => el.dataset.vcYearsYear));
    cy.get('#hijri-default [data-vc="year"]').click();
    years().should('deep.equal', numbers(1441, 1455));
    next('#hijri-default');
    years().should('deep.equal', numbers(1456, 1470));
    prev('#hijri-default', 2);
    years().should('deep.equal', numbers(1426, 1440));

    cy.get('#hijri-default [data-vc-years-year="1430"]').click();
    monthsOf('#hijri-default').should('deep.equal', ['3']);
    yearsOf('#hijri-default').should('deep.equal', ['1430']);
    demo().then((win) => {
      isosOf('#hijri-default', 'current').then((isos) => expect(isos[0]).to.equal(win.vcUtils.getDateFromCalendar(1430, 3, 1, HIJRI)));
    });
  });

  it('walks Hijri weeks in the week type', () => {
    visit();
    isosOf('#hijri-week').should('deep.equal', isoDays('2026-09-21', 7));
    labelsOf('#hijri-week').should('deep.equal', numbers(10, 16));
    monthsOf('#hijri-week').should('deep.equal', ['3']);
    cy.get('#hijri-week [data-vc-week-number]').should('have.attr', 'data-vc-week-number', '39');

    next('#hijri-week', 3);
    isosOf('#hijri-week').should('deep.equal', isoDays('2026-10-12', 7));
    labelsOf('#hijri-week').should('deep.equal', numbers(1, 7));
    monthsOf('#hijri-week').should('deep.equal', ['4']);
    cy.get('#hijri-week [data-vc-week-number]').should('have.attr', 'data-vc-week-number', '42');

    prev('#hijri-week');
    labelsOf('#hijri-week').should('deep.equal', numbers(24, 30));
    monthsOf('#hijri-week').should('deep.equal', ['3']);

    visit();
    prev('#hijri-week', 2);
    isosOf('#hijri-week').should('deep.equal', isoDays('2026-09-07', 7));
    labelsOf('#hijri-week').should('deep.equal', ['25', '26', '27', '28', '29', '1', '2']);
    monthsOf('#hijri-week').should('deep.equal', ['2']);
  });

  it('swipes between Hijri months and back', () => {
    visit();
    swipe('#hijri-swipe', -120);
    monthsOf('#hijri-swipe').should('deep.equal', ['4']);
    swipe('#hijri-swipe', 120);
    monthsOf('#hijri-swipe').should('deep.equal', ['3']);
    swipe('#hijri-swipe', -20);
    monthsOf('#hijri-swipe').should('deep.equal', ['3']);
    isosOf('#hijri-swipe').then((isos) => expect(isos[0]).to.equal('2026-09-07'));
  });

  it('collapses onto the selected week and expands back to the Hijri month', () => {
    visit();
    cy.get('#hijri-collapse [data-vc="collapse"]').click();
    cy.get('#hijri-collapse').should('have.attr', 'data-vc-type', 'week');
    isosOf('#hijri-collapse').should('deep.equal', isoDays('2026-09-21', 7));

    cy.get('#hijri-collapse [data-vc="collapse"]').click();
    cy.get('#hijri-collapse').should('have.attr', 'data-vc-type', 'default');
    cy.get('#hijri-collapse [data-vc-dates="row"]').should('have.length', 5);
    monthsOf('#hijri-collapse').should('deep.equal', ['3']);
  });

  it('names months and weekdays by locale while day numbers stay upstream digits', () => {
    visit();
    demo().then((win) => {
      const name = new win.Intl.DateTimeFormat('ar-SA', { calendar: HIJRI, month: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 8, 21));
      cy.get('#hijri-ar [data-vc="month"]').should('have.text', name);
      const label = new win.Intl.DateTimeFormat('ar-SA', { dateStyle: 'long', timeZone: 'UTC', calendar: HIJRI }).format(Date.UTC(2026, 8, 21));
      cy.get(`#hijri-ar [data-vc-date="${TODAY}"] [data-vc-date-btn]`).should('have.attr', 'aria-label', label);
    });
    cy.get('#hijri-ar [data-vc="year"]').should('have.text', '1448');
    cy.get('#hijri-ar [data-vc-date]').first().should('have.attr', 'data-vc-date', '2026-09-12').and('have.attr', 'data-vc-date-week-day', '6');
    cy.get('#hijri-ar [data-vc-date="2026-09-12"] [data-vc-date-btn]').should('have.text', '1');
    cy.get(`#hijri-ar [data-vc-date="${TODAY}"] [data-vc-date-btn]`).should('have.text', '10');
    cy.get('#hijri-ar [data-vc-date="2026-09-12"]').should('have.attr', 'data-vc-date-weekend');
    cy.get('#hijri-ar [data-vc-date="2026-09-18"]').should('have.attr', 'data-vc-date-weekend');
    cy.get('#hijri-ar [data-vc-date="2026-09-14"]').should('not.have.attr', 'data-vc-date-weekend');

    demo().then((win) => {
      const { week, year } = win.vcUtils.getWeekNumber('2026-09-18', 6);
      cy.get('#hijri-ar [data-vc-week-number]').first().should('have.text', String(week)).click();
      cy.get('#log').should('contain.text', `week ${week} ${year}`);
    });
  });

  it('lists the Hijri months in the month type', () => {
    visit();
    demo().then((win) => {
      const formatter = new win.Intl.DateTimeFormat('en', { calendar: HIJRI, month: 'long', timeZone: 'UTC' });
      const names = Array.from({ length: 12 }, (_, i) => formatter.format(new Date(`${win.vcUtils.getDateFromCalendar(1447, i, 15, HIJRI)}T00:00:00Z`)));
      cy.get('#hijri-month-type [data-vc-months-month]').then(($months) =>
        expect(Cypress._.map($months, (el: HTMLElement) => el.ariaLabel)).to.deep.equal(names),
      );
    });
    cy.get('#hijri-month-type [data-vc-months-month="3"]').should('have.attr', 'data-vc-months-month-selected');
    cy.get('#hijri-month-type [data-vc-months-month="8"]').click();
    calendarOf('hijri-month-type').then((cal) => expect(cal.context.selectedMonth).to.equal(8));
  });

  it('lists Hijri years in the year type', () => {
    visit();
    cy.get('#hijri-year-type [data-vc-years-year]').then(($years) =>
      expect(Cypress._.map($years, (el: HTMLElement) => el.dataset.vcYearsYear)).to.deep.equal(numbers(1441, 1455)),
    );
    cy.get('#hijri-year-type [data-vc-years-year="1448"]').should('have.attr', 'data-vc-years-year-selected');
    cy.get('#hijri-year-type [data-vc-years-year="1450"]').click();
    calendarOf('hijri-year-type').then((cal) => expect(cal.context.selectedYear).to.equal(1450));
  });

  it('opens a Hijri popup from an input and writes the ISO date back', () => {
    visit();
    cy.get('#hijri-input').click();
    cy.get('[data-vc="calendar"][data-vc-input]').should('be.visible').and('have.attr', 'data-vc-calendar', HIJRI);
    cy.get('[data-vc-input] [data-vc="month"]').should('have.attr', 'data-vc-month', '3');
    cy.get('[data-vc-input] [data-vc-date-month="current"]').should('have.length', 30).first().should('have.attr', 'data-vc-date', '2026-09-12');
    cy.get('[data-vc-input] [data-vc-date="2026-09-23"] [data-vc-date-btn]').click();
    cy.get('#hijri-input').should('have.value', '2026-09-23');
  });

  it('jumps to the Hijri month of the selected date', () => {
    visit();
    monthsOf('#hijri-jump').should('deep.equal', ['8']);
    yearsOf('#hijri-jump').should('deep.equal', ['1448']);
    cy.get('#hijri-jump [data-vc-date="2027-02-22"]').should('have.attr', 'data-vc-date-selected');
    cy.get('#hijri-jump [data-vc-date="2027-02-22"]').should('have.attr', 'data-vc-date-month', 'current');
  });

  it('opens on the Hijri month of a future displayDateMin', () => {
    visit();
    demo().then((win) => {
      const { year, month } = win.vcUtils.getCalendarDate('2099-01-01', HIJRI);
      monthsOf('#hijri-display-future').should('deep.equal', [String(month)]);
      yearsOf('#hijri-display-future').should('deep.equal', [String(year)]);
    });
  });

  it('moves by monthsToSwitch across the year', () => {
    visit();
    next('#hijri-months-to-switch');
    monthsOf('#hijri-months-to-switch').should('deep.equal', ['0']);
    yearsOf('#hijri-months-to-switch').should('deep.equal', ['1448']);
    prev('#hijri-months-to-switch', 2);
    monthsOf('#hijri-months-to-switch').should('deep.equal', ['8']);
    yearsOf('#hijri-months-to-switch').should('deep.equal', ['1447']);
  });

  it('hides the outside days when displayDatesOutside is off', () => {
    visit();
    cy.get('#hijri-outside-hidden [data-vc-date-month="prev"]').should('have.length', 5);
    cy.get('#hijri-outside-hidden [data-vc-date-month="prev"] [data-vc-date-btn]').should('have.length', 0);
    cy.get('#hijri-outside-hidden [data-vc-date-month="current"] [data-vc-date-btn]').should('have.length', 30);
  });

  it('switches calendars with set(), restating the configured month', () => {
    visit();
    monthsOf('#hijri-switch').should('deep.equal', ['8']);
    yearsOf('#hijri-switch').should('deep.equal', ['2026']);

    cy.get('#switch-to-hijri').click();
    cy.get('#hijri-switch').should('have.attr', 'data-vc-calendar', HIJRI);
    monthsOf('#hijri-switch').should('deep.equal', ['3']);
    yearsOf('#hijri-switch').should('deep.equal', ['1448']);
    isosOf('#hijri-switch', 'current').then((isos) => expect(isos[0]).to.equal('2026-09-12'));

    cy.get('#switch-to-gregory').click();
    cy.get('#hijri-switch').should('not.have.attr', 'data-vc-calendar');
    monthsOf('#hijri-switch').should('deep.equal', ['8']);
    yearsOf('#hijri-switch').should('deep.equal', ['2026']);
  });

  it('keeps the visible month when switching with month and year kept', () => {
    visit();
    next('#hijri-switch');
    monthsOf('#hijri-switch').should('deep.equal', ['9']);
    cy.get('#switch-to-hijri-keep').click();
    monthsOf('#hijri-switch').should('deep.equal', ['4']);
    yearsOf('#hijri-switch').should('deep.equal', ['1448']);
    cy.get('#switch-to-gregory-keep').click();
    monthsOf('#hijri-switch').should('deep.equal', ['9']);
    yearsOf('#hijri-switch').should('deep.equal', ['2026']);
  });

  it('round-trips a month whose day 15 falls in another month', () => {
    visit();
    cy.get('#switch-2023-to-hijri').click();
    monthsOf('#hijri-switch-2023').should('deep.equal', ['1']);
    yearsOf('#hijri-switch-2023').should('deep.equal', ['1445']);
    cy.get('#switch-2023-to-gregory').click();
    monthsOf('#hijri-switch-2023').should('deep.equal', ['8']);
    yearsOf('#hijri-switch-2023').should('deep.equal', ['2023']);
    cy.get('#switch-2023-to-hijri').click();
    monthsOf('#hijri-switch-2023').should('deep.equal', ['1']);
    yearsOf('#hijri-switch-2023').should('deep.equal', ['1445']);
  });

  it('leaves the Gregorian calendar untouched', () => {
    visit();
    cy.get('#greg-control').should('not.have.attr', 'data-vc-calendar');
    labelsOf('#greg-control', 'current').should('deep.equal', numbers(1, 30));
    isosOf('#greg-control', 'current').should('deep.equal', isoDays('2026-09-01', 30));
    demo().then((win) => {
      const label = new win.Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 8, 21));
      cy.get(`#greg-control [data-vc-date="${TODAY}"] [data-vc-date-btn]`).should('have.attr', 'aria-label', label);
    });
  });

  it('refuses unsupported calendars', () => {
    visit();
    cy.get('#btn-invalid').click();
    cy.get('#log').should('contain.text', 'The «calendar» parameter "islamic-civil" is not supported');
    cy.get('#log').should('contain.text', 'The «calendar» parameter "persian" is not supported');
    cy.get('#log').should('contain.text', 'The «calendar» parameter "foo" is not supported');
    cy.get('#log').should('contain.text', 'set: The «calendar» parameter "foo" is not supported');
    cy.get('#log').should('not.contain.text', 'no error');
    calendarOf('greg-control').then((cal) => expect(cal.calendar).to.equal('gregory'));
  });

  it('validates the inputs of the conversion utilities', () => {
    visit();
    demo().then(({ vcUtils }) => {
      expect(vcUtils.getCalendarDate(TODAY, HIJRI)).to.deep.equal({ year: 1448, month: 3, day: 10 });
      expect(vcUtils.getCalendarDate(TODAY)).to.deep.equal({ year: 2026, month: 8, day: 21 });
      expect(vcUtils.getDateFromCalendar(1448, 0, 1, HIJRI)).to.equal('2026-06-16');
      expect(vcUtils.getDateFromCalendar(2026, 8, 21)).to.equal(TODAY);
      expect(vcUtils.isCalendarSupported(HIJRI)).to.equal(true);
      expect(vcUtils.isCalendarSupported('islamic-civil')).to.equal(false);

      const copy = vcUtils.getCalendarDate(TODAY, HIJRI);
      copy.day = 99;
      expect(vcUtils.getCalendarDate(TODAY, HIJRI).day).to.equal(10);

      expect(() => vcUtils.getCalendarDate('2026-02-30' as never, HIJRI)).to.throw('is not a valid date');
      expect(() => vcUtils.getCalendarDate('foo' as never, HIJRI)).to.throw('is not a valid date');
      expect(() => vcUtils.getDateFromCalendar(1448.5, 0, 1, HIJRI)).to.throw('is not a valid date');
      expect(() => vcUtils.getCalendarDate(TODAY, 'persian' as never)).to.throw('The «calendar» parameter "persian"');
    });
  });
});
