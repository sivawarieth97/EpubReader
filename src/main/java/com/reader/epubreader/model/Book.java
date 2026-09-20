package com.reader.epubreader.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "books")
public class Book {
    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false)
    private String title;

    private String author;

    @Column(nullable = false)
    private String originalFileName;

    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false)
    private Instant uploadedAt;

    private String progressCfi;

    @Column(nullable = false)
    private int progressPercent;

    protected Book() {}

    public Book(String id, String title, String originalFileName, String filePath, Instant uploadedAt) {
        this.id = id;
        this.title = title;
        this.originalFileName = originalFileName;
        this.filePath = filePath;
        this.uploadedAt = uploadedAt;
        this.progressPercent = 0;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(Instant uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public String getProgressCfi() {
        return progressCfi;
    }

    public void setProgressCfi(String progressCfi) {
        this.progressCfi = progressCfi;
    }

    public int getProgressPercent() {
        return progressPercent;
    }

    public void setProgressPercent(int progressPercent) {
        this.progressPercent = progressPercent;
    }
}
