"use client";

import { useRef } from "react";

export function useDocParser() {
  const ocrWorkerRef = useRef<Worker>();

  const ensureWorker = () => {
    if (!ocrWorkerRef.current) {
      ocrWorkerRef.current = new Worker(
        new URL("../../../lib/tesseract.worker.ts", import.meta.url),
        {
          type: "module"
        }
      );
    }
  };

  const parseFile = async (file: File): Promise<string> => {
    ensureWorker();
    if (file.type === "application/pdf") {
      return parsePdf(file, ocrWorkerRef.current!);
    }
    return file.text();
  };

  return { parseFile };
}

async function parsePdf(file: File, worker: Worker): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const text = textContent.items
    .map((item) => ("str" in item ? item.str : ""))
    .filter(Boolean)
    .join(" ");
  if (text.trim().length > 20) return text;
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text;
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return await new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(text), 12000);
    worker.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(String(event.data.text ?? text));
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      resolve(text);
    };
    worker.postMessage({ imageData });
  });
}
