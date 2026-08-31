// Happy path for the v2 cheat-sheet hub: pick a company, read its prep (salary + custom
// company questions + general answers), add a custom company question, and remove a built-in
// "General" question so it stays gone (2.2.0).
//
// Language-independent on purpose: assertions use data-cy hooks and English test data only —
// never translated UI strings — so the spec survives i18n changes.
// Backend is stubbed via cy.interceptApi() + the extra intercepts below.

describe('Cheat sheet hub', () => {
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

  beforeEach(() => {
    cy.interceptApi()
    cy.intercept('GET', '/api/applications', { body: [app] }).as('getApplications')
    // The built-in "General" set: one answered, one left blank so it can be removed
    // without a confirm prompt.
    cy.intercept('GET', '/api/screening-answers', {
      body: [
        { id: 1, questionKey: 'about-me', label: null, answer: 'Backend dev, 5 years', custom: false, sortOrder: 0 },
        { id: 2, questionKey: 'why-changing', label: null, answer: '', custom: false, sortOrder: 1 },
      ],
    }).as('getAnswers')
    cy.intercept('PUT', '/api/screening-answers', (req) => {
      req.reply({ statusCode: 200, body: req.body.answers })
    }).as('saveAnswers')
    // Per-application "About the company": custom questions only — the built-in question is
    // retired, the generated pitch is that answer.
    cy.intercept('GET', '/api/applications/*/screening-answers', {
      body: [
        { id: 10, questionKey: null, label: 'Their funding', answer: 'Series B, 2025', custom: true, sortOrder: 0 },
      ],
    }).as('getCompanyAnswers')
    cy.intercept('PUT', '/api/applications/*/screening-answers', (req) => {
      req.reply({ statusCode: 200, body: req.body.answers })
    }).as('saveCompanyAnswers')
    cy.intercept('GET', '/api/applications/*/brief', { statusCode: 404, body: {} }).as('getBrief')
    cy.login()
    cy.wait('@getApplications')
  })

  it('shows per-application prep: salary + custom company question + general answers', () => {
    cy.get('[data-cy="tab-answers"]').click()
    cy.get('[data-cy="cheat-picker"]').should('contain', 'Acme')

    cy.get('[data-cy="section-company"] .collapsible-toggle').click()
    cy.get('[data-cy="cheat-salary"]').should('contain', 'PLN')
    cy.get('[data-cy="section-company"]').should('contain', 'Series B, 2025')

    cy.get('[data-cy="section-general"] .collapsible-toggle').click()
    cy.get('[data-cy="section-general"]').should('contain', 'Backend dev, 5 years')
  })

  it('adds a custom question in "About the company" and saves it per application', () => {
    cy.get('[data-cy="tab-answers"]').click()

    cy.get('[data-cy="edit-company"]').click()
    cy.get('[data-cy="company-questions-modal"]').should('be.visible')

    cy.get('[data-cy="prep-add"]').click()
    cy.get('[data-cy="company-questions-modal"] .prep-label-input').last().type('Tech stack?')
    cy.get('[data-cy="company-questions-modal"] .prep-textarea').last().type('Java, Spring, Postgres')
    cy.get('[data-cy="prep-save"]').click()

    cy.wait('@saveCompanyAnswers')
      .its('request.body.answers')
      .should((answers) => {
        expect(JSON.stringify(answers)).to.contain('Tech stack?')
      })
  })

  it('removes a built-in "General" question and it stays gone after saving', () => {
    cy.get('[data-cy="tab-answers"]').click()
    cy.get('[data-cy="edit-general"]').click()
    cy.get('[data-cy="global-answers-modal"]').should('be.visible')

    // Two built-in rows; drop the empty one (why-changing, index 1). No confirm for an
    // empty answer.
    cy.get('[data-cy="global-answers-modal"] .prep-remove-btn').should('have.length', 2)
    cy.get('[data-cy="global-answers-modal"] .prep-remove-btn').eq(1).click()
    cy.get('[data-cy="global-answers-modal"] .prep-remove-btn').should('have.length', 1)

    cy.get('[data-cy="prep-save"]').click()

    // The saved set is exactly what is kept — a removed built-in question is not re-seeded.
    cy.wait('@saveAnswers')
      .its('request.body.answers')
      .should((answers) => {
        expect(answers).to.have.length(1)
        expect(answers[0].questionKey).to.equal('about-me')
      })
  })
})
