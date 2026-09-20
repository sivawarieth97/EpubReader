package com.reader.epubreader.repository;

import com.reader.epubreader.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, String> {

    List<Book> findAllByOrderByUploadedAtDesc();

    List<Book> findByTitleContainingIgnoreCaseOrAuthorContainingIgnoreCaseOrderByUploadedAtDesc(
            String title,
            String author);
}
