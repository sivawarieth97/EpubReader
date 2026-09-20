package com.reader.epubreader.dto;

import com.reader.epubreader.model.Book;

import java.time.Instant;

public record BookResponse(
        String id,
        String title,
        String author,
        String coverUrl,
        Instant uploadedAt,
        String progressCfi,
        int progressPercent
) {
    public static BookResponse from(Book book) {
        return new BookResponse(
                book.getId(),
                book.getTitle(),
                book.getAuthor(),
                "/api/books/" + book.getId() + "/cover",
                book.getUploadedAt(),
                book.getProgressCfi(),
                book.getProgressPercent()
        );
    }
}
