
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./PdfPopup.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PdfPopupProps = {
  pdfUrl: string;
  title: string;
  initialPage: number;
  onClose: () => void;
};

export default function PdfPopup({
  pdfUrl,
  title,
  initialPage,
  onClose,
}: PdfPopupProps) {
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(initialPage);
  }, [pdfUrl, initialPage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="pdf-modal-overlay" onMouseDown={onClose}>
      <section
        className="pdf-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pdf-modal-header">
          <div>
            <h2>{title}</h2>
            <p>
              Page {page} of {totalPages || "..."}
            </p>
          </div>

          <button
            type="button"
            className="pdf-close"
            onClick={onClose}
            aria-label="Close PDF"
          >
            ×
          </button>
        </header>

        <div className="pdf-modal-toolbar">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>

          <label>
            Go to page
            <input
              type="number"
              min={1}
              max={totalPages || undefined}
              value={page}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (
                  Number.isInteger(value) &&
                  value >= 1 &&
                  (!totalPages || value <= totalPages)
                ) {
                  setPage(value);
                }
              }}
            />
          </label>

          <button
            type="button"
            disabled={!totalPages || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>

        <div className="pdf-modal-content">
          {error ? (
            <p role="alert">{error}</p>
          ) : (
            <Document
              file={pdfUrl}
              loading="Loading PDF..."
              onLoadSuccess={({ numPages }) => {
                setTotalPages(numPages);
                setPage(Math.min(Math.max(1, initialPage), numPages));
                setError("");
              }}
              onLoadError={() => {
                setError(
                  "Unable to load this PDF. Check its access permissions or hosting."
                );
              }}
            >
              <Page
                pageNumber={page}
                renderTextLayer
                renderAnnotationLayer
                width={Math.min(850, window.innerWidth * 0.8)}
              />
            </Document>
          )}
        </div>
      </section>
    </div>
  );
}
