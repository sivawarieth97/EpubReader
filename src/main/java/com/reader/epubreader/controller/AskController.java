package com.reader.epubreader.controller;

import com.reader.epubreader.dto.AskRequest;
import com.reader.epubreader.dto.AskResponse;
import com.reader.epubreader.service.AskService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ask")
public class AskController {

    private final AskService askService;

    public AskController(AskService askService) {
        this.askService = askService;
    }

    @PostMapping
    public AskResponse ask(@RequestBody AskRequest body) {
        return askService.ask(body.question());
    }
}
