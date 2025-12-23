import { createWorker } from "tesseract.js";

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker({ logger: () => {} });
    await workerPromise.load();
    await workerPromise.loadLanguage("eng");
    await workerPromise.initialize("eng");
  }
  return workerPromise;
}

self.onmessage = async (event: MessageEvent) => {
  const { imageData } = event.data as { imageData: ImageData };
  const worker = await getWorker();
  const result = await worker.recognize(imageData);
  self.postMessage({ text: result.data.text });
};

export {};
