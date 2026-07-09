CREATE TABLE company_briefs
    id BIGSERIAL PRIMARY KEY,
    user_id UUII NOT NULL REFERENCE users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    status VARCHAR(55) NOT NULL,
    industry_pl TEXT NULLABLE




