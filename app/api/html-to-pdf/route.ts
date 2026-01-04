import { NextRequest } from "next/server";
import { chromium as playwright } from "playwright-core";
import chromium from "@sparticuz/chromium";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 60;

// ... (keep your PdfMeta and IncomingFile types same as before)

export async function POST(req: NextRequest) {
  const { files } = await req.json();

  if (!Array.isArray(files) || files.length === 0) {
    return new Response(JSON.stringify({ error: "No files provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Robust path handling for Vercel vs Local
  const isLocal = process.env.NODE_ENV === "development";

  const browser = await playwright.launch({
    args: isLocal ? [] : chromium.args,
    executablePath: isLocal
      ? undefined // Uses local Playwright installation
      : await chromium.executablePath(), // Resolves Vercel binary path
    headless: isLocal ? true : chromium.headless,
  });

  try {
    const pdfBuffers = [];

    for (const file of files) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setContent(file.html, { waitUntil: "networkidle" });

      // ... (keep your metadata injection logic same as before)

      let pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        scale: 0.8,
        margin: {
          top: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
          right: "0.5in",
        },
      });

      await context.close();

      // Process metadata with pdf-lib if provided
      if (file.pdfMeta) {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        // ... (keep your metadata setting logic same as before)
        pdfBuffer = Buffer.from(await pdfDoc.save());
      }

      pdfBuffers.push({
        name: file.name.endsWith(".pdf") ? file.name : `${file.name}.pdf`,
        buffer: pdfBuffer,
      });
    }

    // FIXED: Convert Buffer to Uint8Array to satisfy Response type
    if (pdfBuffers.length === 1) {
      const pdf = pdfBuffers[0];
      return new Response(new Uint8Array(pdf.buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pdf.name}"`,
        },
      });
    }

    const zip = new JSZip();
    pdfBuffers.forEach((pdf) => zip.file(pdf.name, pdf.buffer));
    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });

    return new Response(new Uint8Array(zipArrayBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="updated-pdfs.zip"',
      },
    });
  } catch (error: any) {
    console.error("Vercel PDF Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  } finally {
    await browser.close();
  }
}
