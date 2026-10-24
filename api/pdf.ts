
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const fileId =
    typeof req.query.fileId === "string" ? req.query.fileId : "";

  if (!fileId) {
    return res.status(400).json({
      error: "Missing fileId query parameter",
    });
  }

  // Configure this environment variable in Vercel.
  const allowedIds = (
    process.env.ALLOWED_PDF_FILE_IDS || ""
  )
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!allowedIds.includes(fileId)) {
    return res.status(403).json({
      error: "This PDF is not allowed",
    });
  }

  try {
    const driveUrl = new URL(
      "https://drive.google.com/uc"
    );
    driveUrl.searchParams.set("export", "download");
    driveUrl.searchParams.set("id", fileId);

    const headers: Record<string, string> = {};

    // PDF.js can use Range requests to load parts of a PDF.
    const range = req.headers.range;
    if (range) {
      headers.Range = range;
    }

    const upstream = await fetch(driveUrl.toString(), {
      method: req.method,
      headers,
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({
        error: `Google Drive returned HTTP ${upstream.status}`,
      });
    }

    const contentType =
      upstream.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      return res.status(502).json({
        error:
          "Google Drive returned an HTML page instead of a PDF. Check sharing permissions and download access.",
      });
    }

    // HEAD requests only need headers, not the PDF body.
    if (req.method === "HEAD") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Accept-Ranges", "bytes");

      const contentLength = upstream.headers.get("content-length");
      const contentRange = upstream.headers.get("content-range");

      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }

      return res.status(upstream.status).end();
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const pdfBytes = Buffer.from(arrayBuffer);

    // A complete PDF response should begin with the PDF signature.
    // A partial (206) response may begin in the middle of the file.
    if (
      upstream.status === 200 &&
      !pdfBytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
    ) {
      return res.status(502).json({
        error:
          "Google Drive did not return valid PDF bytes. Ensure the file is shared with anyone who has the link.",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=300");

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) {
      res.setHeader("Content-Range", contentRange);
    }

    // Set the length of the bytes we are actually returning.
    res.setHeader("Content-Length", pdfBytes.length.toString());

    return res.status(upstream.status).send(pdfBytes);
  } catch (error) {
    console.error("PDF proxy error:", error);

    return res.status(500).json({
      error: "Unable to retrieve the PDF from Google Drive",
    });
  }
}
