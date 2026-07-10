CREATE TABLE company_briefs(
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    status VARCHAR(18) NOT NULL DEFAULT 'PENDING',   -- PENDING | READY | FAILED
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    CONSTRAINT uq_company_briefs UNIQUE (user_id, company_name)
);

CREATE TABLE company_fields(
    id BIGSERIAL PRIMARY KEY,
    brief_id BIGINT NOT NULL REFERENCES company_briefs(id) ON DELETE CASCADE,
    field_key VARCHAR(32) NOT NULL,        -- industry | product_customers | tech_stack | size_stage
    lang VARCHAR(8) NOT NULL,              -- 'pl' | 'en' | … (whatever the UI supports)
    text TEXT,                             -- NULL = "not enough public info"
    edited BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_company_field UNIQUE (brief_id, field_key, lang)
);

