
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type DocumentItem = {
  id: number;
  title: string;
  category: string;
  description: string;
  fileId: string;
  shortname: string;
  PDFlanguage: string;
  icon: string;
};

type SongIndex = Record<string, Record<string, number>>;

const documents: DocumentItem[] = [
  {
    id: 1,
    title: "Govinda Sathakam",
    category: "Keerthanams",
    description: "100 songs on Lord Sri Krishna",
    fileId: "/pdfs/Govindashatakam.pdf",
    shortname: "GS",
    PDFlanguage: "Sanskrit",
    icon: "/gs.jpg",
  },
  {
    id: 2,
    title: "Radhika Sathakam",
    category: "Keerthanams",
    description: "100 songs on Sri Radha Devi",
    fileId: "/pdfs/RADHIKA SATHAKAM.pdf",
    shortname: "RS",
    PDFlanguage: "Tamil/Sanskrit",
    icon: "/rs.jpg",
  },
  {
    id: 3,
    title: "Raghava Sathakam",
    category: "Keerthanams",
    description: "100 songs on Lord Sri Rama",
    fileId: "/pdfs/Shri Raghava Sathakam.pdf",
    shortname: "RAS",
    PDFlanguage: "Sanskrit",
    icon: "/ras.jpg",
  },
  {
    id: 4,
    title: "Aathmanivedanam",
    category: "Shlokas",
    description: "Grantha on Sri Venkateshwara Swamy",
    fileId: "/pdfs/Aathmanivetanam.pdf",
    shortname: "AN",
    PDFlanguage: "Tamil",
    icon: "/at.jpg",
  },
  {
    id: 5,
    title: "Bkathakolahala stotram",
    category: "Shlokas",
    description: "Grantha on Kolahalan",
    fileId: "/pdfs/BhakthaKolahalaStotram.pdf",
    shortname: "BS",
    PDFlanguage: "Sanskrit",
    icon: "/bk.jpg",
  },
  {
    id: 6,
    title: "Bhaktaratnavali",
    category: "Shlokas",
    description: "Grantha on various bhatas",
    fileId: "/pdfs/Bhaktharathnavali.pdf",
    shortname: "BR",
    PDFlanguage: "Sanskrit",
    icon: "/br.jpg",
  },
  {
    id: 7,
    title: "Yugala Satakam",
    category: "Keerthanams",
    description: "100 songs on Radha Krishna Yugalam",
    fileId: "/pdfs/Yugala satakam.pdf",
    shortname: "YS",
    PDFlanguage: "Tamil/Sanskrit",
    icon: "/ys.jpg",
  },
];

function getDownloadUrl(filePath: string): string {
  return filePath;
}

function getReaderUrl(doc: DocumentItem): string {
  return `/?pdf=${encodeURIComponent(doc.fileId)}&title=${encodeURIComponent(doc.title)}`;
}

let songIndexCache: SongIndex | null = null;

async function getSongIndex(): Promise<SongIndex> {
  if (songIndexCache) {
    return songIndexCache;
  }

  const response = await fetch("/song-index.json");

  if (!response.ok) {
    throw new Error(
      `Unable to load song-index.json. HTTP status: ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error("song-index.json has an invalid format.");
  }

  songIndexCache = data as SongIndex;
  return songIndexCache;
}

function normalizeSongNumber(value: string): string {
  const digitMap: Record<string, string> = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9",
    "௦": "0",
    "௧": "1",
    "௨": "2",
    "௩": "3",
    "௪": "4",
    "௫": "5",
    "௬": "6",
    "௭": "7",
    "௮": "8",
    "௯": "9",
  };

  return value.replace(/[०-९௦-௯]/g, digit => digitMap[digit]);
}

export default function App() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [searchBook, setSearchBook] = useState("");
  const [searchSloka, setSearchSloka] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const categories = useMemo(
    () => ["All", ...new Set(documents.map(doc => doc.category))],
    []
  );
const searchableDocuments = useMemo(
  () =>
    documents.filter(doc =>
      Object.prototype.hasOwnProperty.call(
        // Replace this with the mapped book title from your JSON.
        {
          "Govinda Sathakam": true,
        },
        doc.title
      )
    ),
  []
);
  const filteredDocuments = useMemo(() => {
    const query = search.toLowerCase().trim();

    return documents.filter(doc => {
      const matchesSearch =
        `${doc.title} ${doc.category} ${doc.description}`
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        selectedCategory === "All" ||
        doc.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const params = new URLSearchParams(window.location.search);
  const readerFileId = params.get("pdf");
  const readerTitle = params.get("title") || "PDF Document";

  const requestedPage = Math.max(
  1,
  Number(params.get("page")) || 1
);

const isPopup = params.get("popup") === "1";
const showNextPage = params.get("nextPage") === "1";
  
const handleSongSearch = async () => {
  const query = searchSloka.trim();

  if (!searchBook || !query) {
    setSearchMessage("Select a book and enter a song/sloka number.");
    return;
  }

  const doc = documents.find(item => item.fileId === searchBook);

  if (!doc) {
    setSearchMessage("Book not found.");
    return;
  }

  const normalizedNumber = normalizeSongNumber(query);

  if (!/^\d+$/.test(normalizedNumber)) {
    setSearchMessage(
      "Enter a song/sloka number, such as 25 or २५."
    );
    return;
  }

  setIsSearching(true);
  setSearchMessage("Finding the page...");

  try {
    const songIndex = await getSongIndex();
    const bookIndex = songIndex[doc.title];

    if (!bookIndex) {
      setSearchMessage(
        `No index found for "${doc.title}". Check the book name in song-index.json.`
      );
      return;
    }

    const pageNumber = bookIndex[normalizedNumber];

    if (
      typeof pageNumber !== "number" ||
      !Number.isInteger(pageNumber) ||
      pageNumber < 1
    ) {
      setSearchMessage(
        `Sloka ${normalizedNumber} was not found in ${doc.title}.`
      );
      return;
    }

    // Open a separate popup at the indexed page.
    // The popup will display this page and the following page.
    const popupParams = new URLSearchParams({
      pdf: doc.fileId,
      title: doc.title,
      page: String(pageNumber),
      nextPage: "1",
      popup: "1",
    });

    const popupUrl = `${window.location.origin}/?${popupParams.toString()}`;

    const popup = window.open(
      popupUrl,
      `song-${doc.shortname}-${normalizedNumber}`,
      "width=1100,height=850,resizable=yes,scrollbars=yes"
    );

    if (!popup) {
      setSearchMessage(
        "The popup was blocked. Please allow popups for this website and try again."
      );
      return;
    }

    popup.focus();
    setSearchMessage(
      `Opened ${doc.title}, song ${normalizedNumber}, starting on page ${pageNumber}.`
    );
  } catch (error) {
    console.error("Song index search failed:", error);

    setSearchMessage(
      error instanceof Error
        ? `Search failed: ${error.message}`
        : "Unable to search the song index."
    );
  } finally {
    setIsSearching(false);
  }
};

  useEffect(() => {
    if (!readerFileId || totalPages === 0) {
      return;
    }

    const pageToOpen = Math.min(requestedPage, totalPages);

    // Wait for React to render the page wrappers before scrolling.
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`pdf-page-${pageToOpen}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });

    return () => cancelAnimationFrame(frame);
  }, [readerFileId, totalPages, requestedPage]);

  const handlePdfLoadSuccess = ({
    numPages,
  }: {
    numPages: number;
  }) => {
    setTotalPages(numPages);
    setCurrentPage(Math.min(requestedPage, numPages));
  };

  // PDF reader page
  if (readerFileId) {
    return (
      <main className="reader-page">
        <header className="reader-toolbar">
          <h2>{readerTitle}</h2>

          <a
            className="download-button"
            href={getDownloadUrl(readerFileId)}
            download
          >
            Download PDF
          </a>
          {isPopup && (
  <button
    type="button"
    className="close-popup-button"
    onClick={() => window.close()}
  >
    Close Window
  </button>
)}
        </header>

        <div className="pdf-viewer">
          <Document
            file={readerFileId}
            onLoadSuccess={handlePdfLoadSuccess}
            onLoadError={error => {
              console.error("PDF loading error:", error);
            }}
            loading={<p>Loading PDF...</p>}
            error={
              <p>
                Unable to load this PDF. Check that the file exists.
              </p>
            }
          >
           
{Array.from(
  {
    length: isPopup
      ? Math.max(
          0,
          Math.min(
            showNextPage ? requestedPage + 1 : requestedPage,
            totalPages
          ) - Math.min(requestedPage, totalPages) + 1
        )
      : totalPages,
  },
  (_, index) => {
    const pageNumber = isPopup
      ? requestedPage + index
      : index + 1;

    return (
      <div
        id={`pdf-page-${pageNumber}`}
        className="pdf-page"
        key={`page_${pageNumber}`}
      >
        <Page
          pageNumber={pageNumber}
          width={Math.max(
            300,
            Math.min(window.innerWidth - 48, 800)
          )}
        />
      </div>
    );
  }
)}

          </Document>
        </div>
      </main>
    );
  }

  // Main library page
  return (
    <main className="app">
      <header className="hero">
        <img
          src="/Srianna.png"
          alt="Website logo"
          className="site-logo"
        />

        <p className="eyebrow">SRI SRI ANNA DIGITAL LIBRARY</p>
        <h1>A repository of Sri Sri Anna</h1>
        <h1>granthas online</h1>

        <input
          className="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by title or category..."
          aria-label="Search documents"
        />
      </header>

      <section className="library">
        
        <h2>Explore documents</h2>

        <div
          className="category-filters"
          aria-label="Filter by category"
        >
          {categories.map(category => (
            <button
              key={category}
              type="button"
              className={`category-chip ${
                selectedCategory === category ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="document-grid">
          {filteredDocuments.map(doc => (
            <article
              className="document-card"
              key={doc.id}
              onClick={() => {
                window.open(
                  getReaderUrl(doc),
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              role="link"
              tabIndex={0}
              onKeyDown={event => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();

                  window.open(
                    getReaderUrl(doc),
                    "_blank",
                    "noopener,noreferrer"
                  );
                }
              }}
              style={{
                backgroundImage: `url("${doc.icon}")`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                backgroundRepeat: "no-repeat",
              }}
            >
              <div className="document-hover-title">
                {doc.title}
              </div>

              <div className="document-card-top">
                <div className="pdf-icon">{doc.shortname}</div>
              </div>

              <div className="document-actions">
                <a
                  className="download-button"
                  href={getDownloadUrl(doc.fileId)}
                  download
                  onClick={event => event.stopPropagation()}
                >
                  Download PDF
                </a>
              </div>
            </article>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <p>No matching documents found.</p>
        )}

<div className="song-search">
          <h2>Find a Song or Sloka</h2>

          <label htmlFor="search-book">Select a book</label>

          <select
            id="search-book"
            value={searchBook}
            onChange={event => {
              setSearchBook(event.target.value);
              setSearchMessage("");
            }}
          >
            <option value="">Choose a book</option>

          {searchableDocuments.map(doc => (
  <option key={doc.id} value={doc.fileId}>
    {doc.title}
  </option>
))}
          </select>

          <label htmlFor="search-sloka">
            Song / Sloka number
          </label>

          <input
            id="search-sloka"
            type="text"
            inputMode="numeric"
            value={searchSloka}
            onChange={event => {
              setSearchSloka(event.target.value);
              setSearchMessage("");
            }}
            onKeyDown={event => {
              if (event.key === "Enter" && !isSearching) {
                void handleSongSearch();
              }
            }}
            placeholder="Enter 25 or २५"
          />

          <button
            type="button"
            onClick={() => void handleSongSearch()}
            disabled={
              !searchBook ||
              !searchSloka.trim() ||
              isSearching
            }
          >
            {isSearching ? "Searching..." : "Find Song / Sloka"}
          </button>

          {searchMessage && (
            <p className="song-search-message" role="status">
              {searchMessage}
            </p>
          )}
        </div>



      </section>
    </main>
  );
}
