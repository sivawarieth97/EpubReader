package com.reader.epubreader.dto;

public record SearchPassageResponse(
        String bookId,
        String title,
        String author,
        String href,
        String snippet
) {}
