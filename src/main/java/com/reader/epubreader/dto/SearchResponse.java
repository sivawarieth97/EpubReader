package com.reader.epubreader.dto;

import java.util.List;

public record SearchResponse(
        String query,
        List<BookResponse> books,
        List<SearchPassageResponse> passages
) {}
