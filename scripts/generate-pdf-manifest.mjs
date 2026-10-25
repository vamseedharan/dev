import fs from "node:fs";
import path from "node:path";

const pdfDirectory = path.resolve("public/pdfs");
const outputFile = path.resolve("src/generatedPdfManifest.ts");

const files = fs
  .readdirSync(pdfDirectory)
  .filter((file) => file.toLowerCase().endsWith(".pdf"))
  .sort((a, b) => a.localeCompare(b));

const pdfs = files.map((file, index) => ({
  id: index + 1,
  title: path.basename(file, path.extname(file))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim(),
  fileId: `/pdfs/${encodeURIComponent(file)}`,
}));

fs.writeFileSync(
  outputFile,
  `export const pdfManifest = ${JSON.stringify(pdfs, null, 2)} as const;\n`,
  "utf8"
);

console.log(`Indexed ${pdfs.length} PDF files.`);