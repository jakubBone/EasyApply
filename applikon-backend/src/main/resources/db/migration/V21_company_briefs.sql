CREATE TABLE company_briefs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUII         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    status       VARCHAR(55)  NOT NULL,
    created_at   TIMESTAMPT NOT NULL,
    updated_at   TIMESTAMP
    CONSTRAINT uq_company_brief UNIQUE (user_id, company_id)
);

CREATE TABLE applications_briefs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUII         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_brief VARCHAR(255) NOT NULL REFERENCES company_briefs(id) ON DELETE CASCADE,
    lang         VARCHAR(8) NOT NULL
    TEXT         TEXT,
    CONSTRAINT uq_company_brief UNIQUE (user_id, company_name)
);











