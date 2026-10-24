
import { useState } from "react";

type SongIndex = Record<string, Record<string, number>>;

type Props = {
  fileId: string;
};

function normalizeDigits(value: string): string {
  const devanagariDigits = "०१२३४५६७८९";

  return value
    .replace(/[०-९]/g, (digit) =>
      String(devanagariDigits.indexOf(digit))
    )
    .trim();
}

export default function SongPdfReader({ fileId }: Props) {
  const [songNumber, setSongNumber] = useState("");
  const [pageNumber, setPageNumber] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  async function searchSong() {
    const target = normalizeDigits(songNumber);

    if (!/^\d+$/.test(target)) {
      setStatus("Enter a song number, such as 108 or १०८.");
      return;
    }

    try {
      setStatus("Searching song index...");
      
      const response = await fetch("/song-index.json");

      if (!response.ok) {
        throw new Error("Could not load song-index.json.");
      }

      const index: SongIndex = await response.json();
      const pdfIndex = index[fileId];
      const page = pdfIndex?.[target];

      if (!page || !Number.isInteger(page) || page < 1) {
        setPageNumber(null);
        setStatus("Song number not found in the index.");
        return;
      }

      setPageNumber(page);
      setStatus(`Song ${target} is listed on PDF page ${page}.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to search the song index."
      );
    }
  }

  const previewUrl =
    `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview` +
    (pageNumber ? `#page=${pageNumber}` : "");

  return (
    <section className="song-reader">
      <div className="song-search">
        <input
          value={songNumber}
          onChange={(event) => setSongNumber(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void searchSong();
            }
          }}
          placeholder="Song number: 108 or १०८"
          aria-label="Song number"
        />

        <button onClick={() => void searchSong()}>
          Search Song
        </button>
      </div>

      {status && <p role="status">{status}</p>}

      <iframe
        key={`${fileId}-${pageNumber ?? "start"}`}
        src={previewUrl}
        title="PDF Reader"
        width="100%"
        height="700"
        style={{ border: "none" }}
        allow="autoplay"
      />
    </section>
  );
}
