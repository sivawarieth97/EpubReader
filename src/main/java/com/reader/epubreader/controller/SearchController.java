package com.reader.epubreader.controller;

import com.reader.epubreader.dto.SearchResponse;
import com.reader.epubreader.service.BookService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final BookService bookService;

    public SearchController(BookService bookService) {
        this.bookService = bookService;
    }

    @GetMapping
    public SearchResponse search(@RequestParam String q) {
        return bookService.search(q);
    }
}
