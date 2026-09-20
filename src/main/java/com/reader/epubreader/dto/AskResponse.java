package com.reader.epubreader.dto;

import java.util.List;

public record AskResponse(String question, String answer, List<SearchPassageResponse> sources) {}
