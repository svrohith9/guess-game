import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { imageData } = event.data as { imageData: ImageData };
  if (!modelPromise) {
    modelPromise = cocoSsd.load();
  }
  const model = await modelPromise;
  const predictions = await model.detect(imageData);
  self.postMessage({ predictions });
};

export {};
