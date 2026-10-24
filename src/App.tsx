
import { useMemo, useState } from "react";
import "./App.css";
import SongPdfReader from "./SongPdfReader";

type DocumentItem = {
  id: number;
  title: string;
  category: string;
  description: string;
  fileId: string;
  shortname:string;
};

const documents: DocumentItem[] = [
  {
    id: 1,
    title: "Govinda Sathakam",
    category: "Keerthanams",
    description: "100 songs on Lord Sri Krishna",
    fileId: "1lV1Hu1OiO40AcCMwHrw3_v71z8v1gMJH",
    shortname:"GS",
  },
  {
    id: 2,
    title: "Radhika Sathakam",
    category: "Keerthanams",
    description: "100 songs on Sri Radha Devi",
    fileId: "1aVOeooNDY8PnYCYBGsl6o7odwY824bvQ",
    shortname:"RS",
  },
  {
    id: 3,
    title: "Raghava Sathakam",
    category: "Keerthanams",
    description: "100 songs on Lord Sri Rama",
    fileId: "1_D1e9DozmnWYtmx-ScJvureSa2JzygLI",
    shortname:"RAS"
  },
];

function getPreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function getDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export default function App() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] =
    useState<DocumentItem | null>(null);

  const filteredDocuments = useMemo(() => {
    const query = search.toLowerCase().trim();

    return documents.filter((doc) =>
      `${doc.title} ${doc.category} ${doc.description}`
        .toLowerCase()
        .includes(query)
    );
  }, [search]);


const params = new URLSearchParams(window.location.search);
const readerFileId = params.get("pdf");
const readerTitle = params.get("title") || "PDF Document";

if (readerFileId) {
  return (
    <main className="reader-page">
      <header className="reader-toolbar">
        <h2>{readerTitle}</h2>

        <a
          className="download-button"
          href={`https://drive.google.com/uc?export=download&id=${readerFileId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          ⬇ Download PDF
        </a>
      </header>

      
<SongPdfReader fileId={readerFileId} />
  


    </main>
  );
}


  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">SRI SRI ANNA DIGITAL LIBRARY</p>
        <h1>A repository of Sri Sri Anna</h1>
        <h1></h1>
        <h1>granthas online</h1>
        

        <input
          className="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title or category..."
          aria-label="Search documents"
        />
      </header>

      <section className="library">
        <h2>Explore documents</h2>

        <div className="document-grid">
          {filteredDocuments.map((doc) => (
            <article className="document-card" key={doc.id}>
              <div className="pdf-icon">{doc.shortname}</div>

              <p className="category">{doc.category}</p>
              <h3>{doc.title}</h3>
              <p>{doc.description}</p>

              <div className="document-actions">
 
<a
  className="read-button"
  href={`/?pdf=${encodeURIComponent(doc.fileId)}&title=${encodeURIComponent(doc.title)}`}
  target="_blank"
  rel="noopener noreferrer"
>
  Read PDF
</a>


  <a
    className="download-button"
    href={getDownloadUrl(doc.fileId)}
    target="_blank"
    rel="noopener noreferrer"
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
      </section>

      {selected && (
        <section className="reader">
          <div className="reader-header">
            <h2>{selected.title}</h2>

            <button onClick={() => setSelected(null)}>
              Close reader
            </button>
          </div>

          <iframe
            key={selected.fileId}
            title={selected.title}
            src={getPreviewUrl(selected.fileId)}
            className="pdf-frame"
            allow="autoplay"
          />

          <div className="reader-actions">
  <a
    className="download-button"
    href={getDownloadUrl(selected.fileId)}
    target="_blank"
    rel="noopener noreferrer"
  >
    Download PDF
  </a>

  <a
    href={`https://drive.google.com/file/d/${selected.fileId}/view`}
    target="_blank"
    rel="noopener noreferrer"
  >
    Open PDF in Google Drive
  </a>
</div>
        </section>
      )}
    </main>
  );
}
