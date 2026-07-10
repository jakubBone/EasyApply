package com.applikon.entity;

// Lifecycle of a CompanyBrief. A retry may start only from FAILED; a READY brief never regenerates.
public enum BriefStatus {
    PENDING, READY, FAILED
}
