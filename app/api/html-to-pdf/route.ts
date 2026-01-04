import { NextRequest } from "next/server";
import { chromium } from "playwright-core";
import chromiumPkg from "@sparticuz/chromium";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
// Vercel function timeout can be increased if you are on a Pro plan,
// but for Hobby, it's 10s-60s.
export const maxDuration = 60;

type PdfMeta = {
  author: string;
  subject: string;
  keywords: string;
  created: string;
  modified: string;
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

export async function POST(req: NextRequest) {
  const { files } = (await req.json()) as { files: IncomingFile[] };

  if (!Array.isArray(files) || files.length === 0) {
    return new Response(JSON.stringify({ error: "No files provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- CHROMIUM SETUP FOR VERCEL ---
  const isLocal = process.env.NODE_ENV === "development";

  const browser = await chromium.launch({
    args: isLocal ? [] : chromiumPkg.args,
    executablePath: isLocal
      ? undefined // Uses local playwright installation
      : await chromiumPkg.executablePath(),
    headless: isLocal ? true : chromiumPkg.headless,
  });
  // ---------------------------------

  try {
    const pdfBuffers: PdfItem[] = [];

    for (const file of files) {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.setContent(file.html, { waitUntil: "networkidle" });

      const titleText =
        (await page.locator("h1").first().textContent())?.trim() ||
        "Untitled Document";

      await page.evaluate((title) => {
        const titleEl = document.querySelector("title");
        if (!titleEl) {
          const newTitle = document.createElement("title");
          newTitle.textContent = title;
          document.head.appendChild(newTitle);
        }
      }, titleText);

      let pdfBuffer = (await page.pdf({
        format: "A4",
        printBackground: true,
        scale: 0.8,
        margin: {
          top: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
          right: "0.5in",
        },
      })) as Buffer;

      await context.close(); // Close context instead of just page

      if (file.pdfMeta) {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        if (file.pdfMeta.author) pdfDoc.setAuthor(file.pdfMeta.author);
        if (file.pdfMeta.subject) pdfDoc.setSubject(file.pdfMeta.subject);
        if (file.pdfMeta.producer) pdfDoc.setProducer(file.pdfMeta.producer);
        if (file.pdfMeta.keywords) {
          const keywordsArray = file.pdfMeta.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);
          pdfDoc.setKeywords(keywordsArray);
        }

        if (file.pdfMeta.created) {
          try {
            pdfDoc.setCreationDate(new Date(file.pdfMeta.created));
          } catch (e) {}
        }
        if (file.pdfMeta.modified) {
          try {
            pdfDoc.setModificationDate(new Date(file.pdfMeta.modified));
          } catch (e) {}
        }

        const pdfBytes = await pdfDoc.save();
        pdfBuffer = Buffer.from(pdfBytes);
      }

      const name = file.name.endsWith(".pdf") ? file.name : `${file.name}.pdf`;
      pdfBuffers.push({ name, buffer: pdfBuffer });
    }

    if (pdfBuffers.length === 1) {
      const pdf = pdfBuffers[0];

      // Convert Node.js Buffer to a standard Uint8Array
      const body = new Uint8Array(pdf.buffer);

      return new Response(body, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pdf.name}"`,
        },
      });
    }

    const zip = new JSZip();
    for (const pdf of pdfBuffers) {
      zip.file(pdf.name, pdf.buffer);
    }
    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
    return new Response(zipArrayBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="updated-pdfs.zip"',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  } finally {
    await browser.close();
  }
}
