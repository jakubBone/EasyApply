// Assertions hook on data-cy, never on translated UI chrome, so the spec survives i18n changes.
// Badge names stay Polish on purpose: the backend sends them as identifiers and the frontend
// looks them up in badges.json `names`, so they are mocked API data, not UI copy.

describe('Badge Widget', () => {
  beforeEach(() => {
    cy.interceptApi()
  })

  describe('Badge Display', () => {
    it('should display badge widget header', () => {
      cy.intercept('GET', '/api/statistics/badges', {
        body: {
          totalRejections: 0,
          totalGhosting: 0,
          totalOffers: 0,
          sweetRevengeUnlocked: false,
          rejectionBadge: { name: null },
          ghostingBadge: { name: null }
        }
      }).as('getBadgesEmpty')

      cy.login()
      cy.wait('@getApplications')
      cy.wait('@getBadgesEmpty')

      cy.get('[data-cy="badge-widget-title"]').should('be.visible')
    })

    it('should expand on click to show badge details', () => {
      cy.intercept('GET', '/api/statistics/badges', {
        body: {
          totalRejections: 5,
          totalGhosting: 3,
          totalOffers: 0,
          sweetRevengeUnlocked: false,
          rejectionBadge: {
            name: 'Rękawica',
            icon: '🥊',
            threshold: 5,
            description: 'Dopiero zaczynasz.',
            nextThreshold: 10,
            nextBadgeName: 'Patelnia'
          },
          ghostingBadge: { name: null }
        }
      }).as('getBadgesWithData')

      cy.login()
      cy.wait('@getApplications')
      cy.wait('@getBadgesWithData')

      // Click to expand
      cy.get('[data-cy="badge-widget-header"]').click()

      // Should show badge details
      cy.get('[data-cy="badge-section-rejections"]').should('be.visible')
      cy.get('[data-cy="badge-row-rejection"]').within(() => {
        cy.get('[data-cy="badge-name"]').should('contain', 'Rękawica')
        cy.get('[data-cy="badge-icon"]').should('contain', '🥊')
      })
    })

    it('should show ghosting badge section', () => {
      cy.intercept('GET', '/api/statistics/badges', {
        body: {
          totalRejections: 10,
          totalGhosting: 5,
          totalOffers: 0,
          sweetRevengeUnlocked: false,
          rejectionBadge: {
            name: 'Patelnia',
            icon: '🍳',
            threshold: 10
          },
          ghostingBadge: {
            name: 'Widmo',
            icon: '👻',
            threshold: 5,
            description: '5 firm nie odpowiedziało.'
          }
        }
      }).as('getBadgesWithGhosting')

      cy.login()
      cy.wait('@getApplications')
      cy.wait('@getBadgesWithGhosting')

      cy.get('[data-cy="badge-widget-header"]').click()

      cy.get('[data-cy="badge-section-ghosting"]').should('be.visible')
      cy.get('[data-cy="badge-row-ghosting"]').within(() => {
        cy.get('[data-cy="badge-name"]').should('contain', 'Widmo')
        cy.get('[data-cy="badge-icon"]').should('contain', '👻')
      })
    })
  })

  describe('Sweet Revenge Achievement', () => {
    it('should display Sweet Revenge when unlocked', () => {
      cy.intercept('GET', '/api/statistics/badges', {
        body: {
          totalRejections: 15,
          totalGhosting: 5,
          totalOffers: 1,
          sweetRevengeUnlocked: true,
          rejectionBadge: {
            name: 'Patelnia',
            icon: '🍳',
            threshold: 10
          },
          ghostingBadge: {
            name: 'Widmo',
            icon: '👻',
            threshold: 5
          }
        }
      }).as('getBadgesWithSweetRevenge')

      cy.login()
      cy.wait('@getApplications')
      cy.wait('@getBadgesWithSweetRevenge')

      cy.get('[data-cy="badge-widget-header"]').click()

      cy.get('[data-cy="badge-sweet-revenge"]').should('be.visible')
    })

    it('should not display Sweet Revenge when not unlocked', () => {
      cy.intercept('GET', '/api/statistics/badges', {
        body: {
          totalRejections: 5,
          totalGhosting: 0,
          totalOffers: 1,
          sweetRevengeUnlocked: false,
          rejectionBadge: {
            name: 'Rękawica',
            icon: '🥊',
            threshold: 5
          },
          ghostingBadge: { name: null }
        }
      }).as('getBadgesNoSweetRevenge')

      cy.login()
      cy.wait('@getApplications')
      cy.wait('@getBadgesNoSweetRevenge')

      cy.get('[data-cy="badge-widget-header"]').click()

      cy.get('[data-cy="badge-sweet-revenge"]').should('not.exist')
    })
  })

  describe('Progress Tracking', () => {
    it('should show next badge information', () => {
      cy.intercept('GET', '/api/statistics/badges', {
        body: {
          totalRejections: 7,
          totalGhosting: 0,
          totalOffers: 0,
          sweetRevengeUnlocked: false,
          rejectionBadge: {
            name: 'Rękawica',
            icon: '🥊',
            threshold: 5,
            currentCount: 7,
            nextThreshold: 10,
            nextBadgeName: 'Patelnia'
          },
          ghostingBadge: { name: null }
        }
      }).as('getBadgesWithProgress')

      cy.login()
      cy.wait('@getApplications')
      cy.wait('@getBadgesWithProgress')

      cy.get('[data-cy="badge-widget-header"]').click()

      // Should show next badge info
      cy.get('[data-cy="badge-row-rejection"]')
        .find('[data-cy="badge-next"]')
        .should('be.visible')
        .and('contain', 'Patelnia')
    })

    it('should show MAX for highest badge', () => {
      cy.intercept('GET', '/api/statistics/badges', {
        body: {
          totalRejections: 100,
          totalGhosting: 0,
          totalOffers: 0,
          sweetRevengeUnlocked: false,
          rejectionBadge: {
            name: 'Statystyczna Pewność',
            icon: '🎰',
            threshold: 100,
            currentCount: 100,
            nextThreshold: null,
            nextBadgeName: null
          },
          ghostingBadge: { name: null }
        }
      }).as('getBadgesMax')

      cy.login()
      cy.wait('@getApplications')
      cy.wait('@getBadgesMax')

      cy.get('[data-cy="badge-widget-header"]').click()

      cy.get('[data-cy="badge-row-rejection"]').within(() => {
        cy.get('[data-cy="badge-name"]').should('contain', 'Statystyczna Pewność')
        cy.get('[data-cy="badge-max"]').should('be.visible')
      })
    })
  })

  describe('Badge Refresh', () => {
    it('should load and display badge widget on initial render', () => {
      cy.intercept('GET', '/api/statistics/badges', {
        body: {
          totalRejections: 5,
          totalGhosting: 0,
          totalOffers: 0,
          sweetRevengeUnlocked: false,
          rejectionBadge: {
            name: 'Rękawica',
            icon: '🥊',
            threshold: 5
          },
          ghostingBadge: { name: null }
        }
      }).as('getBadgesOnLoad')

      cy.login()
      cy.wait('@getApplications')
      cy.wait('@getBadgesOnLoad')

      // Badge widget is rendered and API was called
      cy.get('[data-cy="badge-widget-header"]').should('be.visible')
      cy.get('[data-cy="badge-widget-title"]').should('be.visible')
    })
  })
})
