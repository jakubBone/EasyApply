package com.applikon.dto;

import java.util.List;

public record BriefResponse(String status, List<BriefFieldResponse> fields) {}
