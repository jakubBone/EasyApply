package com.applikon.entity;

/**
 * Lifecycle of a {@link CompanyBrief}.
 *
 * <ul>
 *   <li>{@code PENDING} — generation was triggered and is running in the background.</li>
 *   <li>{@code READY}   — generation finished; the brief's fields are populated.</li>
 *   <li>{@code FAILED}  — the provider errored; the only state a retry may start from.</li>
 * </ul>
 */
public enum BriefStatus {
    PENDING, READY, FAILED
}
