package com.applikon.controller;

import com.applikon.dto.BriefEditRequest;
import com.applikon.dto.BriefResponse;
import com.applikon.security.AuthenticatedUser;
import com.applikon.service.brief.BriefService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Company brief", description = "AI-generated \"About the company\" brief, cached per company")
@RestController
@RequestMapping("/api/applications/{applicationId}/brief")
public class BriefController {

    private final BriefService briefService;

    public BriefController(BriefService briefService) {
        this.briefService = briefService;
    }

    // Async request-reply: always 202, body carries the current status (may already be READY on a cache hit).
    @PostMapping
    public ResponseEntity<BriefResponse> trigger(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long applicationId) {
        return ResponseEntity.accepted().body(briefService.trigger(user.id(), applicationId));
    }

    @GetMapping
    public ResponseEntity<BriefResponse> get(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long applicationId) {
        return ResponseEntity.ok(briefService.get(user.id(), applicationId));
    }

    @PutMapping
    public ResponseEntity<Void> editFields(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long applicationId,
            @Valid @RequestBody BriefEditRequest request) {
        briefService.editFields(user.id(), applicationId, request);
        return ResponseEntity.ok().build();
    }
}
