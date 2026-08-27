package com.applikon.repository;

import com.applikon.dto.ApplicationStats;
import com.applikon.entity.Application;
import com.applikon.entity.ApplicationStatus;
import com.applikon.entity.RejectionReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    @Query("SELECT a FROM Application a WHERE a.user.id = :userId ORDER BY a.appliedAt DESC")
    List<Application> findByUserId(@Param("userId") UUID userId);

    List<Application> findByUserIdAndCompanyIgnoreCaseAndPositionIgnoreCase(
            UUID userId, String company, String position);

    Optional<Application> findByIdAndUserId(Long id, UUID userId);

    boolean existsByIdAndUserId(Long id, UUID userId);

    @Query("SELECT new com.applikon.dto.ApplicationStats(" +
            "SUM(CASE WHEN a.status = :rejected THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN a.status = :rejected AND a.rejectionReason = :ghostingReason THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN a.status = :offer THEN 1 ELSE 0 END)) " +
            "FROM Application a WHERE a.user.id = :userId")
    ApplicationStats getApplicationStats(
            @Param("userId") UUID userId,
            @Param("rejected") ApplicationStatus rejected,
            @Param("offer") ApplicationStatus offer,
            @Param("ghostingReason") RejectionReason ghostingReason);

    @Modifying
    @Query("UPDATE Application a SET a.cv = null WHERE a.cv.id = :cvId")
    void clearCVReferences(@Param("cvId") Long cvId);
}
