describe('Analytics dashboard route coverage', () => {
  it('redirects /dashboard/analytics to /dashboard/analytics/regression', () => {
    cy.visit('/dashboard/analytics');
    cy.url().should('include', '/dashboard/analytics/regression');
    cy.contains('No Dataset Loaded').should('exist');
    cy.contains('← Back to QueryCrafter').should('exist');
  });

  it('shows the dashboard tabs and allows switching analytics views', () => {
    cy.visit('/dashboard/analytics');

    cy.contains('📈 Regression').should('be.visible').click();
    cy.url().should('include', '/dashboard/analytics/regression');

    cy.contains('📊 Bar Chart').should('be.visible').click();
    cy.url().should('include', '/dashboard/analytics/barchart');

    cy.contains('🥧 Pie Chart').should('be.visible').click();
    cy.url().should('include', '/dashboard/analytics/piechart');
  });

  const analyticsRoutes = ['regression', 'barchart', 'piechart'];

  analyticsRoutes.forEach((route) => {
    it(`renders /dashboard/analytics/${route} and displays the empty analytics state`, () => {
      cy.visit(`/dashboard/analytics/${route}`);
      cy.contains('No Dataset Loaded').should('exist');
      cy.contains('← Back to QueryCrafter').should('exist');
    });
  });
});
