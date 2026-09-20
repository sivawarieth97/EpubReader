package com.reader.epubreader.service;

import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@Service
public class EpubMetaReader {

    private static final String NS_CONTAINER = "urn:oasis:names:tc:opendocument:xmlns:container";
    private static final String NS_OPF = "http://www.idpf.org/2007/opf";
    private static final String NS_DC = "http://purl.org/dc/elements/1.1/";

    public record Cover(byte[] bytes, String mediaType, String extension) {}
    public record Result(String title, String author, Cover cover) {}
    public record Chapter(String href, String text) {}

    private EpubMetaReader() {}

    public static Result read(Path epubFile) {
        try(ZipFile zipFile = new ZipFile(epubFile.toFile())) {
            final Document container = parse(zipFile, "META-INF/container.xml");
            final String opfPath = first(container, NS_CONTAINER, "rootfile")
                    .map(el -> el.getAttribute("full-path"))
                    .filter(path -> !path.isBlank())
                    .orElseThrow(() -> new IllegalStateException("No rootfile in container.xml"));

            final Document opfFile = parse(zipFile, opfPath);
            final String title = first(opfFile, NS_DC, "title").map(Element::getTextContent).
                    map(String::trim).filter(i -> !i.isEmpty()).orElse(null);
            final String author = first(opfFile, NS_DC, "creator").map(Element::getTextContent).
                    map(String::trim).filter(i -> !i.isEmpty()).orElse(null);
            Cover cover = findCover(zipFile, opfFile, opfPath).orElse(null);
            return new Result(title, author, cover);


        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static List<Chapter> extractChapters(final Path epubFile) {
        try (ZipFile zip = new ZipFile(epubFile.toFile())) {
            Document container = parse(zip, "META-INF/container.xml");
            String opfPath = first(container, NS_CONTAINER, "rootfile")
                    .map(el -> el.getAttribute("full-path"))
                    .filter(path -> !path.isBlank())
                    .orElseThrow(() -> new IllegalStateException("No rootfile in container.xml"));
            Document opf = parse(zip, opfPath);

            Map<String, Element> manifest = new HashMap<>();
            NodeList items = opf.getElementsByTagNameNS(NS_OPF, "item");
            if (items.getLength() == 0) {
                items = opf.getElementsByTagName("item");
            }
            for (int i = 0; i < items.getLength(); i++) {
                Element item = (Element) items.item(i);
                manifest.put(item.getAttribute("id"), item);
            }

            NodeList refs = opf.getElementsByTagNameNS(NS_OPF, "itemref");
            if (refs.getLength() == 0) {
                refs = opf.getElementsByTagName("itemref");
            }

            List<Chapter> chapters = new ArrayList<>();
            for (int i = 0; i < refs.getLength(); i++) {
                Element ref = (Element) refs.item(i);
                Element item = manifest.get(ref.getAttribute("idref"));
                if (item == null) {
                    continue;
                }
                String media = item.getAttribute("media-type").toLowerCase(Locale.ROOT);
                if (!media.contains("html")) {
                    continue;
                }
                String href = item.getAttribute("href");
                int hash = href.indexOf('#');
                if (hash >= 0) {
                    href = href.substring(0, hash);
                }
                ZipEntry entry = zip.getEntry(resolve(opfPath, href));
                if (entry == null) {
                    continue;
                }
                String html;
                try (InputStream in = zip.getInputStream(entry)) {
                    html = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                }
                String text = plainText(html);
                if (!text.isBlank()) {
                    chapters.add(new Chapter(href, text));
                }
            }
            return chapters;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private static String plainText(String html) {
        return html.replaceAll("(?is)<script.*?</script>", " ")
                .replaceAll("(?is)<style.*?</style>", " ")
                .replaceAll("<[^>]+>", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static Optional<Cover> findCover(ZipFile zip, Document opf, String opfPath) {

        NodeList items = opf.getElementsByTagNameNS(NS_OPF, "item");
        if(items.getLength() == 0)
            items = opf.getElementsByTagName("item");

        String coverId = null;

        NodeList metas = opf.getElementsByTagNameNS(NS_OPF, "meta");
        if(metas.getLength() == 0)
            metas = opf.getElementsByTagName("metas");

        for(int i =0; i<metas.getLength(); i++) {
            Element meta = (Element) metas.item(i);

            if("cover".equals(meta.getAttribute("name")))
                coverId = meta.getAttribute("content");
        }

        Element coverItem = null;

        for(int i =0; i<items.getLength(); i++) {
            Element item = (Element) items.item(i);
            String properties = item.getAttribute("properties");

            if(properties != null && properties.contains("cover-image")) {
                coverItem = item;
                break;
            }

            if (coverId != null && coverId.equals(item.getAttribute("id"))) {
                coverItem = item;
            }
        }

        if (coverItem == null) {
            return Optional.empty();
        }

        String href = coverItem.getAttribute("href");
        String mediaType = coverItem.getAttribute("media-type");
        String entryName = resolve(opfPath, href);
        ZipEntry entry = zip.getEntry(entryName);
        if (entry == null) {
            return Optional.empty();
        }
        try (InputStream in = zip.getInputStream(entry)) {
            return Optional.of(new Cover(in.readAllBytes(), mediaType, extension(mediaType, href)));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }

    private static String resolve(String opfPath, String href) {
        int slash = opfPath.lastIndexOf('/');
        String base = slash >= 0 ? opfPath.substring(0, slash + 1) : "";
        Path resolved = Path.of(base + href).normalize();
        return resolved.toString().replace('\\', '/');
    }

    private static String extension(String mediaType, String href) {
        if (mediaType != null && mediaType.contains("png")) return ".png";
        if (mediaType != null && mediaType.contains("webp")) return ".webp";
        if (mediaType != null && mediaType.contains("gif")) return ".gif";
        if (href != null && href.toLowerCase().endsWith(".png")) return ".png";
        return ".jpg";
    }

    private static Optional<Element> first(Document container, String ns, String tag) {
        NodeList nodeList = container.getElementsByTagNameNS(ns, tag);

        if(nodeList.getLength() == 0)
            nodeList = container.getElementsByTagName(tag);


        if(nodeList.getLength() == 0)
            return Optional.empty();

        return Optional.of((Element) nodeList.item(0));
    }

    private static Document parse(ZipFile zipFile, String name) throws Exception {
        ZipEntry zipEntry = new ZipEntry(name);

        if(zipEntry == null)  {
            throw new IllegalStateException("Missing Zip Entry  : " + name);
        }

        DocumentBuilderFactory documentBuilderFactory = DocumentBuilderFactory.newInstance();
        documentBuilderFactory.setNamespaceAware(true);
        documentBuilderFactory.setExpandEntityReferences(false);
        documentBuilderFactory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        documentBuilderFactory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);

        try(InputStream in = zipFile.getInputStream(zipEntry)) {
            return documentBuilderFactory.newDocumentBuilder().parse(in);
        }
    }
}
