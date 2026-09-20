package com.reader.epubreader.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "annotations")
public class Annotation {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 36)
    private String bookId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String cfiRange;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false)
    private Instant createdAt;

    protected Annotation() {}

    public Annotation(String id, String bookId, String cfiRange, String text, String note, Instant createdAt) {
        this.id = id;
        this.bookId = bookId;
        this.cfiRange = cfiRange;
        this.text = text;
        this.note = note;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public String getBookId() {
        return bookId;
    }

    public String getCfiRange() {
        return cfiRange;
    }

    public String getText() {
        return text;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setBookId(String bookId) {
        this.bookId = bookId;
    }

    public void setCfiRange(String cfiRange) {
        this.cfiRange = cfiRange;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
