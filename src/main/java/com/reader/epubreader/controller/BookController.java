package com.reader.epubreader.controller;

import com.reader.epubreader.dto.*;
import com.reader.epubreader.service.BookService;
import com.reader.epubreader.service.EpubMetaReader;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Locale;

@RestController
@RequestMapping("api/books")
public class BookController {

    public final BookService bookService;
    public final EpubMetaReader epubMetaReader;

    public record ProgressRequest(String cfi, int percent) {}

    public BookController(BookService bookService, EpubMetaReader epubMetaReader) {
        this.bookService = bookService;
        this.epubMetaReader = epubMetaReader;
    }

    @GetMapping
    public BookListResponse getList() {
        return new BookListResponse(bookService.getBookListResponse());
    }

    @GetMapping("/{id}")
    public BookResponse getBook(@PathVariable String id) {
        return bookService.getBook(id);
    }

    @PostMapping
    public ResponseEntity<BookResponse> uploadBook(@RequestParam("file") final MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.uploadBook(file));
    }

    @GetMapping("/{id}/cover")
    public ResponseEntity<Resource> getCover(@PathVariable String id) {
        return bookService.findCover(id)
                .map(path -> ResponseEntity.ok()
                        .contentType(mediaTypeFor(path))
                        .body((Resource) new FileSystemResource(path)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable String id) throws IOException {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> getFile(@PathVariable String id) {
        Path path = bookService.findBookFile(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/epub+zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"book.epub\"")
                .body(new FileSystemResource(path));
    }

    @PutMapping("/{id}/progress")
    public BookResponse updateProgress(@PathVariable String id, @RequestBody ProgressRequest body) {
        return bookService.updateProgress(id, body.cfi(), body.percent());
    }

    @GetMapping("/{id}/annotations")
    public AnnotationListResponse listAnnotations(@PathVariable String id) {
        return bookService.listAnnotations(id);
    }

    @PostMapping("/{id}/annotations")
    public ResponseEntity<AnnotationResponse> createAnnotation(
            @PathVariable String id,
            @RequestBody CreateAnnotationRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookService.createAnnotation(id, body));
    }

    @PutMapping("/{id}/annotations/{annotationId}")
    public AnnotationResponse updateAnnotation(
            @PathVariable String id,
            @PathVariable String annotationId,
            @RequestBody UpdateAnnotationRequest body) {
        return bookService.updateAnnotation(id, annotationId, body.note());
    }

    @DeleteMapping("/{id}/annotations/{annotationId}")
    public ResponseEntity<Void> deleteAnnotation(
            @PathVariable String id,
            @PathVariable String annotationId) {
        bookService.deleteAnnotation(id, annotationId);
        return ResponseEntity.noContent().build();
    }

    private MediaType mediaTypeFor(Path path) {
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (name.endsWith(".gif")) {
            return MediaType.IMAGE_GIF;
        }
        if (name.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }
}
