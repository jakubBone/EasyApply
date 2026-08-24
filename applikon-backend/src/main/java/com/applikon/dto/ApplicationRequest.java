package com.applikon.dto;

import com.applikon.entity.ContractType;
import com.applikon.entity.SalaryType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record ApplicationRequest(
        @NotBlank(message = "{validation.company.required}") String company,
        @NotBlank(message = "{validation.position.required}") String position,
        String link,
        @Min(value = 0, message = "{validation.salary.positive}") Integer salary,
        @Min(value = 0, message = "{validation.salary.positive}") Integer salaryMin,
        @Min(value = 0, message = "{validation.salary.positive}") Integer salaryMax,
        String currency,
        SalaryType salaryType,
        ContractType contractType,
        String source,
        String jobDescription) {}
