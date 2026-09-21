// Runs against the built package instead of the sources: serve package/dist and run
//   CYPRESS_DIST=1 cypress run --config baseUrl=http://localhost:8931 --spec cypress/e2e/dist.cy.ts
type DistWindow = {
  eval: (code: string) => unknown;
  VanillaCalendarProUtils: { getDateFromCalendar: (year: number, month: number, day: number, calendar: string) => string };
};

type CalendarModule = { Calendar: new (element: HTMLElement, options: object) => { init: () => void } };

(Cypress.env('DIST') ? describe : describe.skip)('Built package (dist)', () => {
  it('renders a Hijri month from the UMD bundle', () => {
    cy.visit('/index.html');
    cy.get('#calendar-hijri').should('have.attr', 'data-vc-calendar', 'islamic-umalqura');
    cy.get('#calendar-hijri [data-vc="month"]').should('have.attr', 'data-vc-month', '3');
    cy.get('#calendar-hijri [data-vc="year"]').should('have.attr', 'data-vc-year', '1448');
    cy.get('#calendar-hijri [data-vc-date-month="current"]').should('have.length', 30).first().should('have.attr', 'data-vc-date', '2026-09-12');
    cy.window().then((win) => {
      const { VanillaCalendarProUtils } = win as unknown as DistWindow;
      expect(VanillaCalendarProUtils.getDateFromCalendar(1448, 0, 1, 'islamic-umalqura')).to.equal('2026-06-16');
    });
  });

  it('renders a Hijri month from the ES module', () => {
    cy.visit('/index.html');
    cy.window().then((win) => {
      const loading = (win as unknown as DistWindow).eval(`import('${win.location.origin}/index.mjs')`) as Promise<unknown>;
      return cy.wrap(loading).then((module) => {
        const { Calendar } = module as CalendarModule;
        const el = win.document.body.appendChild(win.document.createElement('div'));
        el.id = 'calendar-esm';
        new Calendar(el, { calendar: 'islamic-umalqura', dateToday: '2026-09-21' }).init();
      });
    });
    cy.get('#calendar-esm [data-vc="month"]').should('have.attr', 'data-vc-month', '3');
    cy.get('#calendar-esm [data-vc-date-month="current"]').first().should('have.attr', 'data-vc-date', '2026-09-12');
  });
});
