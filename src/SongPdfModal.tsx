
import { useEffect } from "react";
import "./SongPdfModal.css";

type SongPdfModalProps = {
  fileId: string;
  title: string;
  pageNumber: number;
  onClose: () => void;
};

export default function SongPdfModal({
  fileId,
  title,
  pageNumber,
  onClose,
}: SongPdfModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

 const pdfUrl =
  `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;

const iframeUrl = `${pdfUrl}#page=${pageNumber}`;
  return (
    <div
      className="song-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="song-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="song-modal-header">
          <div>
            <h2>{title}</h2>
            <p>Requested PDF page: {pageNumber}</p>
          </div>

          <button
            type="button"
            className="song-modal-close"
            onClick={onClose}
            aria-label="Close PDF"
          >
            ×
          </button>
        </header>

       <iframe
  key={`${fileId}-${pageNumber}`}
  title={title}
  src={iframeUrl}
  className="song-modal-iframe"
  allow="autoplay"
/>
      </div>
    </div>
  );
}
