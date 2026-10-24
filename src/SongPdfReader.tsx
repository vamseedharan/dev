
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./SongPdfReader.css";

// Configure the PDF.js worker for Vite.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type SongIndex = Record<string, Record<string, number>>;

type SongPdfReaderProps = {
  fileId: string;
};

function normalizeDigits(value: string): string {
  return value
    .replace(/[०-९]/g, (digit) =>
      String("०१२३४५६७८९".indexOf(digit))
    )
    .trim();
}

export default function SongPdfReader({
  fileId,
}: SongPdfReaderProps) {
  const [songIndex, setSongIndex] = useState<SongIndex>({});
  const [songNumber, setSongNumber] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [indexError, setIndexError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [pageInput, setPageInput] = useState("1");
  const [message, setMessage] = useState("");

  // Load the song-to-page mapping.
  useEffect(() => {
    let cancelled = false;

    async function loadSongIndex() {
      setLoadingIndex(true);
      setIndexError("");

      try {
        const response = await fetch("/song-index.json");

        if (!response.ok) {
          throw new Error(
            `Could not load song-index.json (${response.status}).`
          );
        }

        const data = (await response.json()) as SongIndex;

        if (!cancelled) {
          setSongIndex(data);
        }
      } catch (error) {
        if (!cancelled) {
          setIndexError(
            error instanceof Error
              ? error.message
              : "Could not load the song index."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingIndex(false);
        }
      }
    }

    void loadSongIndex();

    return () => {
      cancelled = true;
    };
  }, []);

  // Your API endpoint must fetch the Google Drive PDF server-side.
  const pdfUrl = `/api/pdf?fileId=${encodeURIComponent(fileId)}`;

  function handleDocumentLoadSuccess({
    numPages,
  }: {
    numPages: number;
  }) {
    setTotalPages(numPages);
    setCurrentPage(1);
    setPageInput("1");
    setLoadingPdf(false);
    setPdfError("");
  }

  function handleDocumentLoadError(error: Error) {
    setLoadingPdf(false);
    setPdfError(
      `Unable to load the PDF. ${error.message}`
    );
  }

  function goToPage(page: number) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > totalPages
    ) {
      setMessage(`Enter a page between 1 and ${totalPages}.`);
      return;
    }

    setCurrentPage(page);
    setPageInput(String(page));
    setMessage("");
  }

  function searchSong() {
    const normalizedNumber = normalizeDigits(songNumber);

    if (!normalizedNumber || !/^\d+$/.test(normalizedNumber)) {
      setMessage("Enter a valid song number, such as 108 or १०८.");
      return;
    }

    // Prefer a mapping specifically for this Google Drive file ID.
    // "Test" is supported temporarily for your existing sample JSON.
    const fileSongIndex =
      songIndex[fileId] ?? songIndex["Test"];

    if (!fileSongIndex) {
      setMessage(
        "No song index exists for this PDF. Check song-index.json."
      );
      return;
    }

    const page = fileSongIndex[normalizedNumber];

    if (typeof page !== "number") {
      setMessage(`Song ${normalizedNumber} was not found in the index.`);
      return;
    }

    if (totalPages > 0 && (page < 1 || page > totalPages)) {
      setMessage(
        `The indexed page ${page} is outside this PDF's page range.`
      );
      return;
    }

    goToPage(page);
    setMessage(`Song ${normalizedNumber} — PDF page ${page}.`);
  }

  function submitPage() {
    const page = Number(pageInput);
    goToPage(page);
  }

  return (
    <section className="song-reader">
      <div className="song-search-panel">
        <label htmlFor="song-number">Search by song number</label>

        <div className="song-search-row">
          <input
            id="song-number"
            type="text"
            inputMode="numeric"
            value={songNumber}
            onChange={(event) => setSongNumber(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") searchSong();
            }}
            placeholder="e.g. 108 or १०८"
          />

          <button type="button" onClick={searchSong}>
            Search
          </button>
        </div>

        {loadingIndex && <p>Loading song index…</p>}
        {indexError && <p className="reader-error">{indexError}</p>}
        {message && <p className="reader-message">{message}</p>}
      </div>

      <div className="pdf-pagination">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || totalPages === 0}
        >
          ← Previous
        </button>

        <form
          className="page-jump-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitPage();
          }}
        >
          <label htmlFor="pdf-page-number">Page</label>
          <input
            id="pdf-page-number"
            type="number"
            min={1}
            max={totalPages || undefined}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
          />
          <span>of {totalPages || "—"}</span>
          <button type="submit" disabled={!totalPages}>
            Go
          </button>
        </form>

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
        >
          Next →
        </button>
      </div>

      {loadingPdf && !pdfError && (
        <p className="reader-status">Loading PDF…</p>
      )}

      {pdfError && <p className="reader-error">{pdfError}</p>}

      <div className="pdf-page-container">
        <Document
          file={pdfUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={<p>Opening PDF…</p>}
          error={<p>Could not open this PDF.</p>}
        >
          {totalPages > 0 && (
            <Page
              key={`${fileId}-${currentPage}`}
              pageNumber={currentPage}
              renderTextLayer
              renderAnnotationLayer
              width={Math.min(
                900,
                typeof window !== "undefined"
                  ? window.innerWidth - 48
                  : 800
              )}
            />
          )}
        </Document>
      </div>
    </section>
  );
}
