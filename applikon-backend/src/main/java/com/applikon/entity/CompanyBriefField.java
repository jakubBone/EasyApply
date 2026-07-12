package com.applikon.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

// One brief field in one language (row per field × language), so a new locale or field is just a new
// row, never a migration. text = null means "not enough public info", shown as an explicit marker
// rather than a guess. edited = true means the user overwrote the generated value — which marks it as
// the user's own data for the GDPR export.
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

    @Column(name = "field_key", nullable = false, length = 32)
    private String fieldKey;

    @Column(nullable = false, length = 8)
    private String lang;

    // null = "not enough public info"
    @Column(columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    private boolean edited;
}
