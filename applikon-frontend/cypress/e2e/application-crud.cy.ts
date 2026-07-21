describe('Application CRUD Operations', () => {
  beforeEach(() => {
    cy.interceptApi()
    cy.login()
    cy.wait('@getApplications')
    cy.wait('@getBadges')
  })

  describe('Create Application', () => {
    it('should open the application form', () => {
      cy.get('[data-cy="add-application-btn"]').click()
      cy.get('[data-cy="form-modal"]').should('be.visible')
      cy.get('[data-cy="form-title"]').should('be.visible')
    })

    it('should close the form when clicking Cancel', () => {
      cy.get('[data-cy="add-application-btn"]').click()
      cy.get('[data-cy="form-modal"]').should('be.visible')
      cy.get('[data-cy="form-cancel-btn"]').click()
      cy.get('[data-cy="form-modal"]').should('not.exist')
    })

    it('should create a new application with required fields', () => {
      cy.get('[data-cy="add-application-btn"]').click()

      cy.get('#create-company').type('Google')
      cy.get('#create-position').type('Junior Developer')

      cy.get('[data-cy="form-submit-btn"]').click()

      cy.wait('@createApplication').its('request.body').should('deep.include', {
        company: 'Google',
        position: 'Junior Developer'
      })
    })

    it('should create application with salary information', () => {
      cy.get('[data-cy="add-application-btn"]').click()

      cy.get('#create-company').type('Meta')
      cy.get('#create-position').type('Software Engineer')
      cy.get('input[name="salaryMin"]').type('10000')
      cy.get('select[name="currency"]').select('EUR')

      cy.get('[data-cy="form-submit-btn"]').click()

      cy.wait('@createApplication').its('request.body').should('deep.include', {
        company: 'Meta',
        position: 'Software Engineer',
        salaryMin: 10000,
        currency: 'EUR'
      })
    })

    it('should show salary range when salary range checkbox is checked', () => {
      cy.get('[data-cy="add-application-btn"]').click()

      // Initially only one salary input
      cy.get('input[name="salaryMin"]').should('have.length', 1)
      cy.get('input[name="salaryMax"]').should('not.exist')

      // Check the salary range checkbox
      cy.get('input[name="isRange"]').check()

      // Now both inputs should be visible
      cy.get('[data-cy="salary-from"]').should('be.visible')
      cy.get('[data-cy="salary-to"]').should('be.visible')
    })

    it('should create application with salary range', () => {
      cy.get('[data-cy="add-application-btn"]').click()

      cy.get('#create-company').type('Stripe')
      cy.get('#create-position').type('Backend Dev')
      cy.get('input[name="isRange"]').check()
      cy.get('[data-cy="salary-from"]').type('15000')
      cy.get('[data-cy="salary-to"]').type('25000')

      cy.get('[data-cy="form-submit-btn"]').click()

      cy.wait('@createApplication').its('request.body').should('deep.include', {
        company: 'Stripe',
        position: 'Backend Dev',
        salaryMin: 15000,
        salaryMax: 25000
      })
    })
  })

  describe('Duplicate Warning', () => {
    it('should show duplicate warning for existing application', () => {
      // Mock duplicate check to return an existing application
      cy.intercept('GET', '/api/applications/check-duplicate*', {
        body: [{
          id: 1,
          company: 'Google',
          position: 'Developer',
          appliedAt: '2024-01-15T10:00:00'
        }]
      }).as('checkDuplicateWithResult')

      cy.get('[data-cy="add-application-btn"]').click()
      cy.get('#create-company').type('Google')
      cy.get('#create-position').type('Developer')

      cy.get('[data-cy="form-submit-btn"]').click()

      cy.wait('@checkDuplicateWithResult')

      // Warning names the clashing company; submitting again is what confirms it.
      // (scroll into view — the form modal may overflow)
      cy.get('[data-cy="duplicate-warning"]').scrollIntoView().should('be.visible').and('contain', 'Google')
      cy.get('[data-cy="form-submit-btn"]').scrollIntoView().should('be.visible')
    })

    it('should allow creating duplicate after confirmation', () => {
      // Mock duplicate check
      cy.intercept('GET', '/api/applications/check-duplicate*', {
        body: [{
          id: 1,
          company: 'Google',
          position: 'Developer',
          appliedAt: '2024-01-15T10:00:00'
        }]
      }).as('checkDuplicateWithResult')

      cy.get('[data-cy="add-application-btn"]').click()
      cy.get('#create-company').type('Google')
      cy.get('#create-position').type('Developer')

      cy.get('[data-cy="form-submit-btn"]').click()
      cy.wait('@checkDuplicateWithResult')

      // Confirm creation despite duplicate
      cy.get('[data-cy="form-submit-btn"]').click()

      cy.wait('@createApplication')
    })
  })

  describe('View Switching', () => {
    it('should switch to list view', () => {
      cy.get('[data-cy="tab-lista"]').click()
      cy.get('table').should('be.visible')
    })

    it('should switch to CV view', () => {
      cy.get('[data-cy="tab-cv"]').click()
      cy.get('[data-cy="cv-title"]').should('be.visible')
    })

    it('should switch back to Kanban view', () => {
      cy.get('[data-cy="tab-lista"]').click()
      cy.get('table').should('be.visible')

      cy.get('[data-cy="tab-kanban"]').click()
      cy.get('[data-cy="kanban-board"]').should('be.visible')
    })
  })
})
