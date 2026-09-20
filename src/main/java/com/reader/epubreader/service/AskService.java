package com.reader.epubreader.service;

import com.reader.epubreader.dto.AskResponse;
import com.reader.epubreader.dto.SearchPassageResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;

@Service
public class AskService {

    private static final String SYSTEM = """
            You are a librarian for a private EPUB library.
            The passages below were already found in the user's books.
            Answer using those passages. Cite book titles.
            Do not invent plot.
            Never say you could not find anything, that nothing matched, or that the library is empty.
            If the passages only partly answer the question, summarize what they do contain.
            """;

    private final BookIndex bookIndex;
    private final RestClient gemini;
    private final String model;
    private final boolean configured;
    private final String apiKey;

    public AskService(BookIndex bookIndex,
                      @Value("${gemini.api-key}") String apiKey,
                      @Value("${gemini.base-url}") String baseUrl,
                      @Value("${gemini.model}") String model) {
        this.bookIndex = bookIndex;
        this.model = model;
        this.configured = apiKey != null && !apiKey.isBlank();
        this.gemini = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.apiKey = apiKey == null ? "" : apiKey;
    }

    public AskResponse ask(String rawQuestion) {
        String question = rawQuestion == null ? "" : rawQuestion.trim();
        if (question.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question is required.");
        }

        List<SearchPassageResponse> sources = bookIndex.search(question, 8);
        if (sources.isEmpty()) {
            return new AskResponse(
                    question,
                    "I could not find that in your library. Try different words, or use the search box for exact names.",
                    List.of());
        }

        if (!configured) {
            return new AskResponse(question, "", sources);
        }

        StringBuilder user = new StringBuilder();
        user.append("Question: ").append(question).append("\n\nPassages:\n");
        for (int i = 0; i < sources.size(); i++) {
            SearchPassageResponse p = sources.get(i);
            user.append(i + 1).append(". ")
                    .append(p.title())
                    .append(p.author() == null ? "" : " — " + p.author())
                    .append(" [").append(p.href()).append("]\n")
                    .append(p.snippet()).append("\n\n");
        }

        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", SYSTEM))),
                "contents", List.of(
                        Map.of("role", "user", "parts", List.of(Map.of("text", user.toString())))
                )
        );

        try {
            JsonNode root = gemini.post()
                    .uri("/models/{model}:generateContent?key={key}", model, apiKey)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String answer = root == null ? ""
                    : root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
            return new AskResponse(question, answer, sources);
        } catch (Exception ignored) {
            return new AskResponse(question, "", sources);
        }
    }
}
