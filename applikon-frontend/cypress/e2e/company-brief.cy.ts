// Happy path for the AI company brief: an application without one offers the ✨ button,
// generating shows the pending state, the ready brief renders its fields, and editing one
// field sends only that field.
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

  // size_stage is null in every locale — the "not enough public info" case.
  const readyBrief = {
    status: 'READY',
    fields: [
      { key: 'industry', texts: { pl: 'Payments company', en: 'Payments company' }, edited: false },
      { key: 'product_customers', texts: { pl: 'Card issuing for banks', en: 'Card issuing for banks' }, edited: false },
      { key: 'tech_stack', texts: { pl: 'Java, Kafka', en: 'Java, Kafka' }, edited: false },
      { key: 'size_stage', texts: { pl: null, en: null }, edited: false },
    ],
  }

  // What GET /brief answers right now: null = never generated (the backend answers 404).
  let brief: unknown = null

  beforeEach(() => {
    brief = null
    cy.interceptApi()
    cy.intercept('GET', '/api/applications', { body: [app] }).as('getApplications')
    cy.intercept('GET', '/api/screening-answers', { body: [] }).as('getAnswers')
    cy.intercept('GET', '/api/applications/*/screening-answers', {
      body: [
        { id: 10, questionKey: 'company-knowledge', label: null, answer: 'Growth stage', custom: false, sortOrder: 0 },
      ],
    }).as('getCompanyAnswers')
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

  it('generates a brief from the section header and renders its fields', () => {
    cy.intercept('POST', '/api/applications/*/brief', (req) => {
      brief = pendingBrief
      req.reply({ statusCode: 202, body: pendingBrief })
    }).as('triggerBrief')

    cy.get('[data-cy="tab-answers"]').click()
    cy.get('[data-cy="section-company"] .collapsible-toggle').click()

    cy.get('[data-cy="brief-generate"]').click()
    cy.wait('@triggerBrief')
    cy.get('[data-cy="brief-generating"]').should('be.visible')

    // Generation finishes between two polls; the section swaps itself for the fields.
    cy.then(() => {
      brief = readyBrief
    })
    cy.get('[data-cy="brief-field-industry"]').should('contain', 'Payments company')
    cy.get('[data-cy="brief-field-tech_stack"]').should('contain', 'Java, Kafka')

    // A ready brief never offers regeneration.
    cy.get('[data-cy="brief-generate"]').should('not.exist')
  })

  it('edits one brief field and sends only that field', () => {
    brief = readyBrief
    cy.intercept('PUT', '/api/applications/*/brief', { statusCode: 200 }).as('saveBrief')
    cy.intercept('PUT', '/api/applications/*/screening-answers', (req) => {
      req.reply({ statusCode: 200, body: req.body.answers })
    }).as('saveCompanyAnswers')

    cy.get('[data-cy="tab-answers"]').click()
    cy.get('[data-cy="edit-company"]').click()
    cy.get('[data-cy="company-questions-modal"]').should('be.visible')

    cy.get('[data-cy="brief-edit-tech_stack"]').clear().type('Java, Spring, Postgres')
    cy.get('[data-cy="prep-save"]').click()

    // Only the touched field is sent: submitting all four would flag untouched generated
    // text as the user's own, and edited=true is what puts a field in the GDPR export.
    cy.wait('@saveBrief')
      .its('request.body.fields')
      .should((fields) => {
        expect(fields).to.have.length(1)
        expect(fields[0].fieldKey).to.equal('tech_stack')
        expect(fields[0].text).to.equal('Java, Spring, Postgres')
      })
  })
})
