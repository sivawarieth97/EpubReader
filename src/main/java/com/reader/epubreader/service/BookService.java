package com.reader.epubreader.service;

import com.reader.epubreader.dto.*;
import com.reader.epubreader.model.Annotation;
import com.reader.epubreader.model.Book;
import com.reader.epubreader.repository.AnnotationRepository;
import com.reader.epubreader.repository.BookRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.FileSystemUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookService {

    private final BookRepository bookRepository;
    private final AnnotationRepository annotationRepository;
    private final BookIndex bookIndex;
    private final Path subdir;

    public BookService(BookRepository bookRepository, AnnotationRepository annotationRepository, BookIndex bookIndex,
                       @Value("${app.storage.dir}")  Path subdir) {
        this.bookRepository = bookRepository;
        this.annotationRepository = annotationRepository;
        this.bookIndex = bookIndex;
        this.subdir = subdir;
    }

    @Transactional
    public void deleteBook(final String id) throws IOException {

        final Book book = bookRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No book with that id."));
        Path bookDir = subdir.resolve(id).toAbsolutePath().normalize();
        Path root = subdir.toAbsolutePath().normalize();
        if (!bookDir.startsWith(root) || bookDir.equals(root)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Refusing to delete storage root.");
        }

        FileSystemUtils.deleteRecursively(bookDir);
        annotationRepository.deleteByBookId(id);
        bookRepository.delete(book);
        bookIndex.removeBook(id);
    }


    public List<BookResponse> getBookListResponse() {
       return bookRepository.findAllByOrderByUploadedAtDesc()
               .stream()
               .map(BookResponse::from)
               .toList();
    }

    public BookResponse getBook(final String id) {
        return bookRepository.findById(id)
                .map(BookResponse::from)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No book with that id."));
    }

    public SearchResponse search(String q) {
        String query = q == null ? "" : q.trim();
        if (query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query is required.");
        }
        List<BookResponse> books = bookRepository
                .findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCaseOrderByUploadedAtDesc(query, query)
                .stream()
                .map(BookResponse::from)
                .toList();
        List<SearchPassageResponse> passages = bookIndex.search(query, 20);
        return new SearchResponse(query, books, passages);
    }

    public BookResponse uploadBook(MultipartFile file) {

        validate(file);

        final String id = UUID.randomUUID().toString();
        final String originalFileName = file.getOriginalFilename();
        final String filenameTitle = originalFileName.substring(0, originalFileName.length() - ".epub".length());
        final Path bookDir = subdir.resolve(id);
        final Path bookFile = bookDir.resolve("book.epub");

        try {
            Files.createDirectories(bookDir);
            file.transferTo(bookFile);

            if(!isZip(bookFile)) {
                FileSystemUtils.deleteRecursively(bookDir);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"File is not a epub file");
            }

            EpubMetaReader.Result meta = EpubMetaReader.read(bookFile);
            String title = meta.title() != null ? meta.title() : filenameTitle;

            Book book = new Book(id, title, originalFileName, bookFile.toString(), Instant.now());
            book.setAuthor(meta.author());

            if (meta.cover() != null) {
                Files.write(bookDir.resolve("cover" + meta.cover().extension()), meta.cover().bytes());
            }

            bookRepository.save(book);
            bookIndex.indexBook(id, title, book.getAuthor(), EpubMetaReader.extractChapters(bookFile));

            return BookResponse.from(book);

        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Optional<Path> findCover(String id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No book with that id."));

        Path dir = Path.of(book.getFilePath()).getParent();
        if (dir == null) {
            return Optional.empty();
        }

        for (String name : List.of("cover.jpg", "cover.jpeg", "cover.png", "cover.webp", "cover.gif")) {
            Path candidate = dir.resolve(name);
            if (Files.exists(candidate)) {
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }

    public BookResponse updateProgress(String id, String cfi, int percent) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No book with that id."));
        int clamped = Math.max(0, Math.min(100, percent));
        book.setProgressCfi(cfi);
        book.setProgressPercent(clamped);
        bookRepository.save(book);
        return BookResponse.from(book);
    }

    public Path findBookFile(final String id) {
        final Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No book with that id."));

        final Path path = Path.of(book.getFilePath());
        if (!Files.exists(path) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "EPUB file is missing on disk.");
        }
        return path;
    }

    public AnnotationListResponse listAnnotations(String bookId) {
        getBook(bookId); // 404 if the book does not exist
        return new AnnotationListResponse(
                annotationRepository.findByBookIdOrderByCreatedAtDesc(bookId)
                        .stream()
                        .map(AnnotationResponse::from)
                        .toList());
    }

    public AnnotationResponse createAnnotation(String bookId, CreateAnnotationRequest body) {
        getBook(bookId);
        if (body.cfiRange() == null || body.cfiRange().isBlank()
                || body.text() == null || body.text().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cfiRange and text are required.");
        }
        Annotation saved = annotationRepository.save(new Annotation(
                UUID.randomUUID().toString(),
                bookId,
                body.cfiRange(),
                body.text(),
                body.note(),
                Instant.now()));
        return AnnotationResponse.from(saved);
    }

    public AnnotationResponse updateAnnotation(String bookId, String annotationId, String note) {
        Annotation row = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No annotation with that id."));
        if (!bookId.equals(row.getBookId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No annotation with that id.");
        }
        row.setNote(note);
        return AnnotationResponse.from(annotationRepository.save(row));
    }

    public void deleteAnnotation(String bookId, String annotationId) {
        Annotation row = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No annotation with that id."));
        if (!bookId.equals(row.getBookId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No annotation with that id.");
        }
        annotationRepository.delete(row);
    }

    private void validate(final MultipartFile file) {
        if(file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"File is empty");
        }
        final String fileName = file.getOriginalFilename();
        if(fileName == null || !fileName.toLowerCase(Locale.ROOT).endsWith(".epub")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"File is not a epub file");
        }
    }

    private boolean isZip(Path file) throws IOException {
        try (InputStream in = Files.newInputStream(file)) {
            byte[] header = in.readNBytes(4);
            return header.length == 4
                    && header[0] == 0x50
                    && header[1] == 0x4B
                    && header[2] == 0x03
                    && header[3] == 0x04;
        }
    }
}
