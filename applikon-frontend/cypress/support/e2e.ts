// ***********************************************************
// This file is loaded automatically before test files.
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

declare global {
  namespace Cypress {
    interface Chainable {
      login(path?: string): void
      interceptApi(): void
    }
  }
}

/**
 * cy.login() — simulates a logged-in user without going through OAuth2.
 *
 * How it works:
 * 1. Sets a fake JWT token in localStorage before the app loads
 *    (onBeforeLoad ensures the token is present BEFORE AuthProvider initializes)
 * 2. Intercepts GET /api/auth/me and returns a mock user
 *    (AuthProvider calls this endpoint on startup, we need to respond)
 * 3. Visits the main page and waits for identity verification to complete
 */
Cypress.Commands.add('login', (path = '/') => {
  // privacyPolicyAcceptedAt must be set: ConsentGate holds the whole dashboard behind the
  // consent modal while it is null, so no view ever loads and every spec's first cy.wait()
  // times out on a request the app never made.
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    privacyPolicyAcceptedAt: '2026-04-23T10:00:00',
  }

  cy.intercept('GET', '**/api/auth/me', mockUser).as('authMe')

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('applikon_token', 'fake-test-token')
      win.localStorage.setItem('i18nextLng', 'pl')
      win.localStorage.setItem('tour_guide_completed', 'true')
    },
  })

  cy.wait('@authMe')
})

// API intercepts
// Default response bodies prevent requests from reaching the real backend with
// a fake token, which would return 401 and trigger apiFetch's window.location redirect.
Cypress.Commands.add('interceptApi', () => {
  cy.intercept('GET', '/api/applications', { body: [] }).as('getApplications')
  cy.intercept('POST', '/api/applications', (req) => {
    req.reply({ statusCode: 201, body: { id: 999, ...req.body, status: 'WYSLANE' } })
  }).as('createApplication')
  cy.intercept('PUT', '/api/applications/*', (req) => {
    req.reply({ statusCode: 200, body: { id: 1, ...req.body } })
  }).as('updateApplication')
  cy.intercept('PATCH', '/api/applications/*/status', (req) => {
    req.reply({ statusCode: 200, body: {} })
  }).as('updateStatus')
  cy.intercept('PATCH', '/api/applications/*/stage', (req) => {
    req.reply({ statusCode: 200, body: { id: 1, ...req.body } })
  }).as('updateStage')
  cy.intercept('DELETE', '/api/applications/*', { statusCode: 204 }).as('deleteApplication')
  cy.intercept('GET', '/api/applications/*/notes', { body: [] }).as('getNotes')
  cy.intercept('POST', '/api/applications/*/notes', (req) => {
    req.reply({ statusCode: 201, body: { id: 1, ...req.body } })
  }).as('createNote')
  cy.intercept('GET', '/api/statistics/badges', {
    body: {
      totalRejections: 0,
      totalGhosting: 0,
      totalOffers: 0,
      sweetRevengeUnlocked: false,
      rejectionBadge: { name: null },
      ghostingBadge: { name: null },
    },
  }).as('getBadges')
  cy.intercept('GET', '/api/cv', { body: [] }).as('getCVs')
  cy.intercept('DELETE', '/api/cv/*', { statusCode: 204 }).as('deleteCV')
  cy.intercept('GET', '/api/applications/check-duplicate*', { body: [] }).as('checkDuplicate')
})
