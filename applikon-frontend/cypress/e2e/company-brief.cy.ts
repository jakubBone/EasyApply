// Happy path for the AI company brief (2.2.0): an application without one offers the ✨
// button, generating shows the pending state, the ready brief renders one labeled pitch,
// editing it sends only the pitch, and deleting it from the editor drops back to ✨ so the
// user can generate again — the regeneration story (ADR-v2-004).
//
// Language-independent on purpose: assertions use data-cy hooks and English test data only —
// never translated UI strings — so the spec survives i18n changes.
// Backend is stubbed via cy.interceptApi() + the brief intercepts below; the GET responds from
// a mutable `brief`, which is how a poll can find READY what an earlier poll found PENDING.

describe('Company brief', () => {
  const app = {
    id: 1,
    company: 'Acme',
    position: 'Java Developer',
    status: 'SENT',
    appliedAt: '2026-06-01T10:00:00',
    currentStage: null,
    rejectionReason: null,
    salary: 12000,
    salaryMin: null,
    salaryMax: null,
    currency: 'PLN',
    salaryType: null,
    contractType: null,
    source: null,
    link: null,
    cvFileName: null,
  }

  const pendingBrief = { status: 'PENDING', fields: [] }

  const readyBrief = {
    status: 'READY',
    fields: [
      {
        key: 'pitch',
        texts: {
          pl: 'Payments company issuing cards for banks, on Java and Kafka.',
          en: 'Payments company issuing cards for banks, on Java and Kafka.',
        },
        edited: false,
      },
    ],
  }

  // What GET /brief answers right now: null = never generated (the backend answers 404).
  let brief: unknown = null

  beforeEach(() => {
    brief = null
    cy.interceptApi()
    cy.intercept('GET', '/api/applications', { body: [app] }).as('getApplications')
    cy.intercept('GET', '/api/screening-answers', { body: [] }).as('getAnswers')
    cy.intercept('GET', '/api/applications/*/screening-answers', { body: [] }).as('getCompanyAnswers')
    cy.intercept('GET', '/api/applications/*/brief', (req) => {
      if (brief === null) {
        req.reply({ statusCode: 404, body: {} })
      } else {
        req.reply({ statusCode: 200, body: brief })
      }
    }).as('getBrief')
    cy.login()
    cy.wait('@getApplications')
  })

  it('generates a brief from the section header and renders the pitch', () => {
    cy.intercept('POST', '/api/applications/*/brief', (req) => {
      brief = pendingBrief
      req.reply({ statusCode: 202, body: pendingBrief })
    }).as('triggerBrief')

    cy.get('[data-cy="tab-answers"]').click()
    cy.get('[data-cy="section-company"] .collapsible-toggle').click()

    cy.get('[data-cy="brief-generate"]').click()
    cy.wait('@triggerBrief')
    cy.get('[data-cy="brief-generating"]').should('be.visible')

    // Generation finishes between two polls; the section swaps itself for the pitch.
    cy.then(() => {
      brief = readyBrief
    })
    cy.get('[data-cy="brief-field-pitch"]').should('contain', 'issuing cards for banks')

    // A ready brief never offers regeneration from the header.
    cy.get('[data-cy="brief-generate"]').should('not.exist')
  })

  it('edits the pitch and sends only the pitch field', () => {
    brief = readyBrief
    cy.intercept('PUT', '/api/applications/*/brief', { statusCode: 200 }).as('saveBrief')
    cy.intercept('PUT', '/api/applications/*/screening-answers', (req) => {
      req.reply({ statusCode: 200, body: req.body.answers })
    }).as('saveCompanyAnswers')

    cy.get('[data-cy="tab-answers"]').click()
    cy.get('[data-cy="edit-company"]').click()
    cy.get('[data-cy="company-questions-modal"]').should('be.visible')

    cy.get('[data-cy="brief-edit-pitch"]').clear().type('Payments company, now also lending.')
    cy.get('[data-cy="prep-save"]').click()

    // edited=true on the pitch is what puts it in the GDPR export, so it is sent only when
    // the user actually changed it.
    cy.wait('@saveBrief')
      .its('request.body.fields')
      .should((fields) => {
        expect(fields).to.have.length(1)
        expect(fields[0].fieldKey).to.equal('pitch')
        expect(fields[0].text).to.equal('Payments company, now also lending.')
      })
  })

  it('deletes the brief from the editor, then generates again', () => {
    brief = readyBrief
    cy.intercept('DELETE', '/api/applications/*/brief', (req) => {
      brief = null // the company's brief is gone; the next GET 404s
      req.reply({ statusCode: 204 })
    }).as('deleteBrief')
    cy.intercept('PUT', '/api/applications/*/screening-answers', (req) => {
      req.reply({ statusCode: 200, body: req.body.answers })
    }).as('saveCompanyAnswers')

    cy.get('[data-cy="tab-answers"]').click()
    cy.get('[data-cy="section-company"] .collapsible-toggle').click()
    cy.get('[data-cy="brief-field-pitch"]').should('be.visible')

    cy.get('[data-cy="edit-company"]').click()
    cy.get('[data-cy="brief-pitch-delete"]').click() // Cypress auto-accepts the confirm
    cy.wait('@deleteBrief')

    // The editor closed and the section fell back to the generate action.
    cy.get('[data-cy="company-questions-modal"]').should('not.exist')
    cy.get('[data-cy="brief-field-pitch"]').should('not.exist')
    cy.get('[data-cy="brief-generate"]').should('be.visible')

    cy.intercept('POST', '/api/applications/*/brief', (req) => {
      brief = pendingBrief
      req.reply({ statusCode: 202, body: pendingBrief })
    }).as('triggerBrief')

    cy.get('[data-cy="brief-generate"]').click()
    cy.wait('@triggerBrief')
    cy.get('[data-cy="brief-generating"]').should('be.visible')
  })
})
