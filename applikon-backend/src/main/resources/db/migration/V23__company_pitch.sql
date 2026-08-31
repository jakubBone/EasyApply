-- 2.2.0: the brief collapses from four researched fields to one, 'pitch'.
-- Order matters: each step below can feed rows into the next.

-- 1. Fold hand-edited text from the old fields into 'pitch', newest edit wins.
--    No collision on uq_brief_field: no 'pitch' row exists yet at this point.
INSERT INTO company_brief_fields (brief_id, field_key, lang, text, edited)
SELECT DISTINCT ON (brief_id, lang) brief_id, 'pitch', lang, text, TRUE
FROM   company_brief_fields
WHERE  edited = TRUE AND field_key <> 'pitch'
ORDER  BY brief_id, lang, id DESC;

-- 2. Generated text is derived public data, thrown away.
DELETE FROM company_brief_fields WHERE field_key <> 'pitch';

-- 3. A brief left with no fields held only generated text — drop it so the
--    section falls back to the generate button.
DELETE FROM company_briefs b
WHERE NOT EXISTS (SELECT 1 FROM company_brief_fields f WHERE f.brief_id = b.id);

-- 4. The retired "Tell us about your project" question and every answer under it.
DELETE FROM screening_answers WHERE custom = FALSE AND question_key = 'project';

-- 5. The built-in "What do you know about us?" question (per-application,
--    question_key = 'company-knowledge') merges into 'pitch' instead of staying
--    a separate row — the two read as duplicates of each other. Newest answer
--    per (user, company) wins.
--
--    One statement on purpose: a WITH clause is only in scope for the single
--    statement it heads, and a data-modifying CTE's inserted rows are invisible
--    to sibling CTEs except through its own RETURNING. So `ensured_brief` upserts
--    the brief (DO UPDATE, not DO NOTHING, so its RETURNING also covers a brief
--    that already existed) and the final INSERT reads the pitch text straight off
--    that RETURNING output joined back to newest_answer.
WITH newest_answer AS (
    SELECT DISTINCT ON (a.user_id, ap.company)
           a.user_id, ap.company AS company_name, a.answer
    FROM   screening_answers a
    JOIN   applications ap ON ap.id = a.application_id
    WHERE  a.custom = FALSE
      AND  a.question_key = 'company-knowledge'
      AND  a.answer IS NOT NULL AND a.answer <> ''
    ORDER  BY a.user_id, ap.company, COALESCE(a.updated_at, a.created_at) DESC, a.id DESC
),
ensured_brief AS (
    INSERT INTO company_briefs (user_id, company_name, status, created_at, updated_at)
    SELECT user_id, company_name, 'READY', now(), now()
    FROM   newest_answer
    ON CONFLICT (user_id, company_name)
        DO UPDATE SET status = 'READY', updated_at = now()
    RETURNING id, user_id, company_name
)
INSERT INTO company_brief_fields (brief_id, field_key, lang, text, edited)
SELECT eb.id, 'pitch', lang.code, n.answer, TRUE
FROM   ensured_brief eb
JOIN   newest_answer n
  ON   n.user_id = eb.user_id AND n.company_name = eb.company_name
CROSS JOIN (VALUES ('pl'), ('en')) AS lang(code)
ON CONFLICT (brief_id, field_key, lang) DO UPDATE SET text = EXCLUDED.text, edited = TRUE;

-- The question itself is retired now that its answer lives on the brief.
DELETE FROM screening_answers WHERE custom = FALSE AND question_key = 'company-knowledge';
