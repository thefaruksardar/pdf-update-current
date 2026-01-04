import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";

/* ================= TYPES ================= */

type PdfMeta = {
  author?: string;
  subject?: string;
  keywords?: string;
  created?: string;
  modified?: string;
  producer?: string;
};

type IncomingFile = {
  name: string;
  html: string;
  pdfMeta?: PdfMeta;
};

type PdfItem = {
  name: string;
  buffer: Buffer;
};

/* ============== HELPERS ================= */

// 🔑 THIS is the important fix
const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => {
  const ab = new ArrayBuffer(buf.byteLength);
  const view = new Uint8Array(ab);
  view.set(buf);
  return ab;
};

/* ============== HANDLER ================= */

export async function POST(req: NextRequest) {
  const { files } = (await req.json()) as { files: IncomingFile[] };

  if (!Array.isArray(files) || files.length === 0) {
    return new Response(JSON.stringify({ error: "No files provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isVercel = !!process.env.VERCEL;

  const browser = await playwrightChromium.launch({
    args: isVercel ? chromium.args : [],
    executablePath: isVercel ? await chromium.executablePath() : undefined, // local dev uses Playwright Chromium
    headless: true,
  });

  try {
    const pdfBuffers: PdfItem[] = [];

    for (const file of files) {
      const page = await browser.newPage();

      await page.setContent(file.html, { waitUntil: "networkidle" });

      // Extract <h1> → <title>
      const titleText =
        (await page.locator("h1").first().textContent())?.trim() ||
        "Untitled Document";

      await page.evaluate((title) => {
        let el = document.querySelector("title");
        if (!el) {
          el = document.createElement("title");
          document.head.appendChild(el);
        }
        el.textContent = title;
      }, titleText);

      let pdfBuffer = Buffer.from(
        await page.pdf({
          format: "A4",
          printBackground: true,
          scale: 0.8,
          margin: {
            top: "0.5in",
            bottom: "0.5in",
            left: "0.5in",
            right: "0.5in",
          },
        })
      );

      await page.close();

      /* ===== Apply PDF metadata ===== */
      if (file.pdfMeta) {
        const pdfDoc = await PDFDocument.load(pdfBuffer);

        if (file.pdfMeta.author) pdfDoc.setAuthor(file.pdfMeta.author);
        if (file.pdfMeta.subject) pdfDoc.setSubject(file.pdfMeta.subject);
        if (file.pdfMeta.producer) pdfDoc.setProducer(file.pdfMeta.producer);

        if (file.pdfMeta.keywords) {
          pdfDoc.setKeywords(
            file.pdfMeta.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          );
        }

        if (file.pdfMeta.created) {
          try {
            pdfDoc.setCreationDate(new Date(file.pdfMeta.created));
          } catch {}
        }

        if (file.pdfMeta.modified) {
          try {
            pdfDoc.setModificationDate(new Date(file.pdfMeta.modified));
          } catch {}
        }

        pdfBuffer = Buffer.from(await pdfDoc.save());
      }

      const name = file.name.endsWith(".pdf") ? file.name : `${file.name}.pdf`;

      pdfBuffers.push({ name, buffer: pdfBuffer });
    }

    /* ===== SINGLE PDF ===== */
    if (pdfBuffers.length === 1) {
      const pdf = pdfBuffers[0];

      return new Response(bufferToArrayBuffer(pdf.buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pdf.name}"`,
        },
      });
    }

    /* ===== ZIP MULTIPLE PDFs ===== */
    const zip = new JSZip();
    for (const pdf of pdfBuffers) {
      zip.file(pdf.name, pdf.buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(bufferToArrayBuffer(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="updated-pdfs.zip"',
      },
    });
  } finally {
    await browser.close();
  }
}
