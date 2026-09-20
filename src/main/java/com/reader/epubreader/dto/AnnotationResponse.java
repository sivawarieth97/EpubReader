package com.reader.epubreader.dto;

import com.reader.epubreader.model.Annotation;
import java.time.Instant;

public record AnnotationResponse(
        String id,
        String bookId,
        String cfiRange,
        String text,
        String note,
        Instant createdAt
) {
    public static AnnotationResponse from(Annotation a) {
        return new AnnotationResponse(
                a.getId(), a.getBookId(), a.getCfiRange(),
                a.getText(), a.getNote(), a.getCreatedAt());
    }
}
