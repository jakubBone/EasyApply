package com.applikon.entity;

import com.applikon.dto.ApplicationRequest;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "applications")
@EntityListeners(AuditingEntityListener.class) // enable automatic @CreateData/@LasModifiedDate
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "{validation.company.required}")
    @Column(nullable = false)
    private String company;

    @NotBlank(message = "{validation.position.required}")
    @Column(nullable = false)
    private String position;

    private String link;

    @Min(value = 0, message = "{validation.salary.positive}")
    private Integer salary;

    @Min(value = 0, message = "{validation.salary.positive}")
    private Integer salaryMin;

    @Min(value = 0, message = "{validation.salary.positive}")
    private Integer salaryMax;

    private String currency;

    @Enumerated(EnumType.STRING)
    private SalaryType salaryType;

    @Enumerated(EnumType.STRING)
    private ContractType contractType;

    private String source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status = ApplicationStatus.SENT;

    @Column(columnDefinition = "TEXT")
    private String jobDescription;

    @ManyToOne
    @JoinColumn(name = "cv_id")
    private CV cv;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime appliedAt;

    private String currentStage;

    @Enumerated(EnumType.STRING)
    private RejectionReason rejectionReason;

    private String rejectionDetails;

    public Application() {}

    public static Application from(ApplicationRequest request, User user) {
        Application app = new Application();
        app.setUser(user);
        app.setCompany(request.company());
        app.setPosition(request.position());
        app.setLink(request.link());
        app.setSalary(request.salary());
        app.setSalaryMin(request.salaryMin());
        app.setSalaryMax(request.salaryMax());
        app.setCurrency(request.currency());
        app.setSalaryType(request.salaryType());
        app.setContractType(request.contractType());
        app.setSource(request.source());
        app.setJobDescription(request.jobDescription());
        return app;
    }

    public static Application demoFor(User user) {
        Application app = new Application();
        app.setUser(user);
        app.setCompany("Google");
        app.setPosition("Junior Software Engineer");
        app.setSalaryMin(7000);
        app.setSalaryMax(8000);
        app.setCurrency("PLN");
        app.setSalaryType(SalaryType.NET);
        app.setContractType(ContractType.EMPLOYMENT);
        app.setSource("JustJoinIT");
        app.setLink("https://justjoin.it/");
        app.setStatus(ApplicationStatus.SENT);
        app.setJobDescription("""
                🚀 Junior Software Developer (Java)

                We are looking for a passionate developer to join our team!

                Requirements:
                • Java 11+
                • Spring Boot basics
                • Git, SQL
                • Willingness to learn

                We offer:
                • Remote or hybrid work
                • Mentoring from senior developers
                • Training budget
                • Equipment of your choice

                This is a sample application — feel free to delete or modify it!
                """);
        return app;
    }

    public void updateFrom(ApplicationRequest request) {
        this.company = request.company();
        this.position = request.position();
        this.link = request.link();
        this.salary = request.salary();
        this.salaryMin = request.salaryMin();
        this.salaryMax = request.salaryMax();
        this.currency = request.currency();
        this.salaryType = request.salaryType();
        this.contractType = request.contractType();
        this.source = request.source();
        this.jobDescription = request.jobDescription();
    }
}
