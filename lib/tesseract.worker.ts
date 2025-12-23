import { createWorker } from "tesseract.js";

let workerInstance: Awaited<ReturnType<typeof createWorker>> | null = null;

async function getWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker();
    await workerInstance.loadLanguage("eng");
    await workerInstance.initialize("eng");
  }
  return workerInstance;
}

self.onmessage = async (event: MessageEvent) => {
  const { imageData } = event.data as { imageData: ImageData };
  try {
    const worker = await getWorker();
    const result = await worker.recognize(imageData);
    self.postMessage({ text: result.data.text });
  } catch (error) {
    console.error("Tesseract error", error);
    self.postMessage({ text: "" });
  }
};

export {};
