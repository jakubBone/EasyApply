package com.applikon.repository;

import com.applikon.entity.ScreeningAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScreeningAnswerRepository extends JpaRepository<ScreeningAnswer, Long> {

    // "All rows" variants, used by the GDPR export and account deletion, which cover
    // both global and per-application answers.
    List<ScreeningAnswer> findByUserIdOrderBySortOrder(UUID userId);

    void deleteByUserId(UUID userId);

    // Global "My answers" set (application_id IS NULL).
    List<ScreeningAnswer> findByUserIdAndApplicationIdIsNullOrderBySortOrder(UUID userId);

    void deleteByUserIdAndApplicationIdIsNull(UUID userId);

    // Per-application "About the company" set.
    List<ScreeningAnswer> findByUserIdAndApplicationIdOrderBySortOrder(UUID userId, Long applicationId);

    void deleteByUserIdAndApplicationId(UUID userId, Long applicationId);
}
