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
import java.util.ArrayList;
import java.util.List;

/**
 * A cached "company brief" — a small AI-generated dossier about a company, reused across
 * every application the user has to that company (cache-aside per {@code (user, company)}).
 *
 * The aggregate root: all generated and user-edited content lives in {@link CompanyBriefField}
 * rows, one per (field × language), owned by this brief and persisted through it — so the
 * feature needs a single repository. {@code status} drives the async request-reply flow.
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

    /** The company this brief is about — one brief per (user, company), enforced by a unique key. */
    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 18)
    private BriefStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "brief", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CompanyBriefField> fields = new ArrayList<>();

    /** Attaches a field to this brief and keeps both sides of the association in sync. */
    public void addField(CompanyBriefField field) {
        field.setBrief(this);
        fields.add(field);
    }
}
