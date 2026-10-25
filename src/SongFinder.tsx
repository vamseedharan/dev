
import { useEffect, useMemo, useState } from "react";
import "./SongFinder.css";
import SongPdfModal from "./SongPdfModal";

type SongIndex = Record<string, Record<string, number>>;

type SongFinderProps = {
  books: {
    title: string;
    fileId: string;
  }[];
};

function normalizeSongNumber(value: string): string {
  const devanagariDigits = "०१२३४५६७८९";

  return value
    .trim()
    .replace(/[०-९]/g, (digit) =>
      String(devanagariDigits.indexOf(digit))
    )
    .replace(/\s/g, "");
}

export default function SongFinder({ books }: SongFinderProps) {
  const [selectedBook, setSelectedBook] = useState(
    books[0]?.title ?? ""
  );
  const [songNumber, setSongNumber] = useState("");
  const [songIndex, setSongIndex] = useState<SongIndex>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
const [selectedSong, setSelectedSong] = useState<{
  fileId: string;
  title: string;
  pageNumber: number;
} | null>(null);


  useEffect(() => {
    let cancelled = false;

    fetch("/song-index.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load song-index.json");
        }
        return response.json();
      })
      .then((data: SongIndex) => {
        if (!cancelled) {
          setSongIndex(data);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load the song index. Check public/song-index.json.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedNumber = normalizeSongNumber(songNumber);

  const pageNumber = useMemo(() => {
    if (!normalizedNumber || !/^\d+$/.test(normalizedNumber)) {
      return undefined;
    }

    return songIndex[selectedBook]?.[normalizedNumber];
  }, [songIndex, selectedBook, normalizedNumber]);

  const selectedBookInfo = books.find(
    (book) => book.title === selectedBook
  );

 function openSong() {
  if (!selectedBookInfo || pageNumber === undefined) return;

  setSelectedSong({
    fileId: selectedBookInfo.fileId,
    title: `${selectedBookInfo.title} — Song ${normalizedNumber}`,
    pageNumber,
  });
}

  return (
    <section className="song-finder">
      <h2>Find a Song</h2>
      <p>Search by book and song number.</p>

      <label htmlFor="song-book">Select book</label>
      <select
        id="song-book"
        value={selectedBook}
        onChange={(event) => {
          setSelectedBook(event.target.value);
          setSongNumber("");
        }}
      >
        {books.map((book) => (
          <option key={book.fileId} value={book.title}>
            {book.title}
          </option>
        ))}
      </select>

      <label htmlFor="song-number">Song number</label>
      <input
        id="song-number"
        type="text"
        inputMode="numeric"
        value={songNumber}
        onChange={(event) => setSongNumber(event.target.value)}
        placeholder="Enter 12 or १२"
      />

      {loading && <p>Loading song index...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && normalizedNumber !== "" && (
        <div className="song-results" aria-live="polite">
          {pageNumber !== undefined ? (
            <article className="song-result">
              <div>
                <h3>{selectedBook} — Song {normalizedNumber}</h3>
                <p>PDF page: {pageNumber}</p>
              </div>

              <button type="button" onClick={openSong}>
                Read Song
              </button>
            </article>
          ) : (
            <p>No matching song was found in this book.</p>
          )}
        </div>
      )}
      
    </section>
  );
}
