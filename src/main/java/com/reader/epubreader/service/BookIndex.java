package com.reader.epubreader.service;

import com.reader.epubreader.dto.SearchPassageResponse;
import jakarta.annotation.PreDestroy;
import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.*;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexWriter;
import org.apache.lucene.index.IndexWriterConfig;
import org.apache.lucene.index.Term;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.search.highlight.Highlighter;
import org.apache.lucene.search.highlight.QueryScorer;
import org.apache.lucene.search.highlight.SimpleFragmenter;
import org.apache.lucene.store.FSDirectory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class BookIndex {

    private static final Logger log = LoggerFactory.getLogger(BookIndex.class);

    private final Analyzer analyzer = new StandardAnalyzer(); // how should I process the text?
    private final IndexWriter writer; // how do I put that processed information into the index?

    public BookIndex(@Value("${app.index.dir:./data/lucene}") Path indexDir) throws IOException {
        Files.createDirectories(indexDir);
        IndexWriterConfig config = new IndexWriterConfig(analyzer);
        this.writer = new IndexWriter(FSDirectory.open(indexDir), config);
    }

    public void indexBook(String bookId, String title, String author, List<EpubMetaReader.Chapter> chapters) {
        try {
            writer.deleteDocuments(new Term("bookId", bookId));
            for (EpubMetaReader.Chapter chapter : chapters) {
                Document doc = new Document();
                doc.add(new StringField("bookId", bookId, Field.Store.YES));
                doc.add(new StringField("href", chapter.href(), Field.Store.YES));
                doc.add(new StoredField("title", title == null ? "" : title));
                doc.add(new StoredField("author", author == null ? "" : author));
                doc.add(new TextField("content", chapter.text(), Field.Store.YES));
                writer.addDocument(doc);
            }
            writer.commit();
        } catch (IOException e) {
            log.warn("Could not index book {}", bookId, e);
        }
    }

    public void removeBook(String bookId) {
        try {
            writer.deleteDocuments(new Term("bookId", bookId));
            writer.commit();
        } catch (IOException e) {
            log.warn("Could not remove book {} from index", bookId, e);
        }
    }

    public List<SearchPassageResponse> search(String q, int limit) {
        try {
            QueryParser parser = new QueryParser("content", analyzer);
            parser.setDefaultOperator(QueryParser.Operator.AND);
            Query query = parser.parse(QueryParser.escape(q));

            try (DirectoryReader reader = DirectoryReader.open(writer)) {
                if (reader.numDocs() == 0) {
                    return List.of();
                }
                IndexSearcher searcher = new IndexSearcher(reader);
                TopDocs hits = searcher.search(query, limit);
                Highlighter highlighter = new Highlighter(new QueryScorer(query));
                highlighter.setTextFragmenter(new SimpleFragmenter(80));

                List<SearchPassageResponse> passages = new ArrayList<>();
                for (ScoreDoc hit : hits.scoreDocs) {
                    Document doc = searcher.storedFields().document(hit.doc);
                    String content = doc.get("content");
                    String snippet = highlighter.getBestFragment(analyzer, "content", content);
                    if (snippet == null || snippet.isBlank()) {
                        snippet = content.substring(0, Math.min(80, content.length()));
                    }
                    String author = doc.get("author");
                    passages.add(new SearchPassageResponse(
                            doc.get("bookId"),
                            doc.get("title"),
                            author == null || author.isBlank() ? null : author,
                            doc.get("href"),
                            snippet));
                }
                return passages;
            }
        } catch (Exception e) {
            log.warn("Lucene search failed for '{}'", q, e);
            return List.of();
        }
    }

    @PreDestroy
    public void close() throws IOException {
        writer.close();
    }
}
