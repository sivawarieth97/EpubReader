package com.reader.epubreader.repository;

import com.reader.epubreader.model.Annotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnotationRepository extends JpaRepository<Annotation, String> {
    List<Annotation> findByBookIdOrderByCreatedAtDesc(String bookId);
    void deleteByBookId(String bookId);
}
