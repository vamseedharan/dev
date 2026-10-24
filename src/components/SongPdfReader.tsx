
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type SongPdfReaderProps = {
  fileId: string;
  title?: string;
  initialPage?: number;
};

type SearchResult = {
  page: number;
  snippet: string;
};

export default function SongPdfReader({
  fileId,
  title = "PDF Document",
  initialPage = 1,
}: SongPdfReaderProps) {
  const [pdfDocument, setPdfDocument] =
    useState<PDFDocumentProxy | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(
    Math.max(1, initialPage)
  );

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [readerError, setReaderError] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const [pageWidth, setPageWidth] = useState(800);

  const pageTextCache = useRef<Map<number, string>>(new Map());

  const pdfUrl = useMemo(
    () => `/api/pdf?fileId=${encodeURIComponent(fileId)}`,
    [fileId]
  );

  // Keep the reader responsive on smaller screens.
  useEffect(() => {
    const updateWidth = () => {
      setPageWidth(Math.min(window.innerWidth - 40, 800));
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Reset reader state when a different PDF is selected.
  useEffect(() => {
    setPdfDocument(null);
    setNumPages(0);
    setCurrentPage(Math.max(1, initialPage));
    setSearchInput("");
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setReaderError("");
    setShareMessage("");
    pageTextCache.current.clear();
  }, [fileId, initialPage]);

  function handleDocumentLoadSuccess(pdf: PDFDocumentProxy) {
    setPdfDocument(pdf);
    setNumPages(pdf.numPages);
    setCurrentPage(Math.min(Math.max(1, initialPage), pdf.numPages));
    setReaderError("");
  }

  function handleDocumentLoadError(error: Error) {
    console.error("Unable to load PDF:", error);
    setReaderError(
      "Unable to load this PDF. Please check the PDF link and try again."
    );
  }

  function goToPage(page: number) {
    if (numPages === 0) return;

    const validPage = Math.min(Math.max(1, page), numPages);
    setCurrentPage(validPage);
  }

  // Search the text layer of each PDF page.
  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchInput.trim();

    if (!query) {
      setSearchResults([]);
      setSearchQuery("");
      setSearchError("Enter a word or phrase to search.");
      return;
    }

    if (!pdfDocument) {
      setSearchError("Wait for the PDF to finish loading.");
      return;
    }

    setSearchQuery(query);
    setSearchResults([]);
    setSearchError("");
    setIsSearching(true);

    try {
      const results: SearchResult[] = [];
      const normalizedQuery = query.toLocaleLowerCase();

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        let pageText = pageTextCache.current.get(pageNumber);

        if (pageText === undefined) {
          const page = await pdfDocument.getPage(pageNumber);
          const textContent = await page.getTextContent();

          pageText = textContent.items
            .map((item) => {
              if ("str" in item) return item.str;
              return "";
            })
            .join(" ");

          pageTextCache.current.set(pageNumber, pageText);
        }

        const normalizedText = pageText.toLocaleLowerCase();
        const matchIndex = normalizedText.indexOf(normalizedQuery);

        if (matchIndex !== -1) {
          const start = Math.max(0, matchIndex - 65);
          const end = Math.min(
            pageText.length,
            matchIndex + query.length + 100
          );

          const snippet =
            `${start > 0 ? "…" : ""}` +
            pageText.slice(start, end).trim() +
            `${end < pageText.length ? "…" : ""}`;

          results.push({
            page: pageNumber,
            snippet,
          });
        }
      }

      setSearchResults(results);

      if (results.length === 0) {
        setSearchError(
          `No matches found for "${query}". Scanned PDF text may be unavailable if the document contains scanned images.`
        );
      }
    } catch (error) {
      console.error("PDF text search failed:", error);
      setSearchError(
        "Could not search this PDF. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams();

    params.set("pdf", fileId);
    params.set("title", title);
    params.set("page", String(page));

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  async function handleSharePage() {
    const url = buildPageUrl(currentPage);

    try {
      await navigator.clipboard.writeText(url);
      setShareMessage(`Link to page ${currentPage} copied!`);
    } catch {
      // Fallback for browsers that do not allow clipboard access.
      window.prompt("Copy this page link:", url);
      setShareMessage("Copy the link shown above to share this page.");
    }
  }

  const downloadUrl =
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

  return (
    <section className="song-pdf-reader">
      <header className="song-reader-toolbar">
        <div className="song-reader-heading">
          <h2>{title}</h2>
          <p>
            {numPages > 0
              ? `Page ${currentPage} of ${numPages}`
              : "Loading document…"}
          </p>
        </div>

        <div className="song-reader-actions">
          <button
            type="button"
            className="reader-action-button"
            onClick={handleSharePage}
            disabled={!pdfDocument}
          >
            Share this page
          </button>

          <a
            className="reader-action-button"
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download PDF
          </a>
        </div>
      </header>

      {shareMessage && (
        <p className="reader-status" role="status">
          {shareMessage}
        </p>
      )}

      <form className="pdf-text-search" onSubmit={handleSearch}>
        <label htmlFor="pdf-text-search-input">
          Search inside this PDF
        </label>

        <div className="pdf-search-controls">
          <input
            id="pdf-text-search-input"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Enter a word, phrase, or song name"
          />

          <button type="submit" disabled={!pdfDocument || isSearching}>
            {isSearching ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {searchError && (
        <p className="reader-search-message" role="status">
          {searchError}
        </p>
      )}

      {searchResults.length > 0 && (
        <section className="pdf-search-results">
          <h3>
            {searchResults.length} matching page
            {searchResults.length === 1 ? "" : "s"} for "{searchQuery}"
          </h3>

          <ul>
            {searchResults.map((result) => (
              <li key={result.page}>
                <button
                  type="button"
                  className="pdf-search-result"
                  onClick={() => goToPage(result.page)}
                >
                  <span className="pdf-result-page">
                    Page {result.page}
                  </span>
                  <span className="pdf-result-snippet">
                    {result.snippet}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {readerError ? (
        <p className="reader-error" role="alert">
          {readerError}
        </p>
      ) : (
        <Document
          file={pdfUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={<p className="reader-status">Loading PDF…</p>}
          error={
            <p className="reader-error">
              Could not display the PDF. Please try again.
            </p>
          }
        >
          <div className="pdf-page-container">
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
              loading={<p className="reader-status">Loading page…</p>}
            />
          </div>
        </Document>
      )}

      {numPages > 0 && (
        <nav className="pdf-pagination" aria-label="PDF page navigation">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>

          <label htmlFor="pdf-page-number">Page</label>

          <input
            id="pdf-page-number"
            type="number"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "") return;

              const page = Number(value);
              if (Number.isInteger(page)) goToPage(page);
            }}
          />

          <span>of {numPages}</span>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
