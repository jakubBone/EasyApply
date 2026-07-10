package com.applikon.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * One field of a {@link CompanyBrief} in one language — the normalized "row per (field × language)"
 * unit (table {@code company_brief_fields}). The language is a row value, so a new locale is a new row,
 * never a schema change; a new field is a new {@code fieldKey}, never a migration.
 *
 * A {@code null} {@code text} with {@code edited = false} means "not enough public info" — shown
 * to the user as an explicit marker, never hidden and never a guess. {@code edited = true} marks
 * text the user wrote over the generated value; it is exactly what separates the user's own data
 * from derived public data for the GDPR export.
 */
@Getter
@Setter
@Entity
@Table(name = "company_brief_fields")
public class CompanyBriefField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brief_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private CompanyBrief brief;

    /** One of {@code BriefLocales.FIELD_KEYS} (industry|product_customers|tech_stack|size_stage). */
    @Column(name = "field_key", nullable = false, length = 32)
    private String fieldKey;

    /** UI locale this text is written in (e.g. "pl", "en"). */
    @Column(nullable = false, length = 8)
    private String lang;

    /** Generated or user-edited text; {@code null} = "not enough public info". */
    @Column(columnDefinition = "TEXT")
    private String text;

    /** {@code true} once the user overwrote the generated value. */
    @Column(nullable = false)
    private boolean edited;
}
