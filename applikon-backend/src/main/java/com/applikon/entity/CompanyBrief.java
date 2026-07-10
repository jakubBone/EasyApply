package com.applikon.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * A cached "company brief" — a small AI-generated dossier about a company, reused across
 * every application the user has to that company (cache-aside per {@code (user, company)}).
 *
 * The metadata + lifecycle root: {@code status} drives the async request-reply flow. Its content
 * lives in {@link CompanyBriefField} rows, one per (field × language), fetched and written through
 * their own repository (the codebase's child-side convention, as with Note and ScreeningAnswer).
 */
@Getter
@Setter
@Entity
@Table(name = "company_briefs")
@EntityListeners(AuditingEntityListener.class)
public class CompanyBrief {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BriefStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
