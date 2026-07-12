package com.applikon.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

// One screening-question answer. Fixed template questions have a stable questionKey and no label;
// custom questions have a user-provided label and custom = true. application = null means a global
// "My answers" row; a non-null application scopes the answer to that one application.
@Getter
@Setter
@Entity
@Table(name = "screening_answers")
@EntityListeners(AuditingEntityListener.class)
public class ScreeningAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    // Set = scoped to one application ("About the company"); null = global "My answers" row.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Application application;

    // Stable key for a fixed template question; null for custom questions.
    @Column(name = "question_key", length = 64)
    private String questionKey;

    // User-provided label for a custom question; null for fixed questions.
    @Column(length = 255)
    private String label;

    @Size(max = 1000, message = "{validation.screeningAnswer.answer.tooLong}")
    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(nullable = false)
    private boolean custom = false;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
