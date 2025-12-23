"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import Modal from "@/components/Modal";
import Countdown from "@/components/Countdown";
import Hearts from "@/components/Hearts";
import ImageCanvas from "./ImageCanvas";
import QuestionOverlay from "./QuestionOverlay";
import { generateQuizFromImage } from "@/lib/ollama";
import { useCountdown } from "@/hooks/useCountdown";
import { queueWrite, flushQueue, storeFile } from "@/lib/storage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { GameQuestion, useStore } from "@/lib/store";

type DetectedObject = {
  label: string;
  color: string;
  bbox: [number, number, number, number];
};

type DetectionPayload = {
  objects: DetectedObject[];
  texts: string[];
};

export default function Module1Page() {
  const {
    lives,
    score,
    questionIndex,
    setLives,
    addScore,
    addXp,
    setQuestionIndex,
    resetGame,
    imageUrl,
    setImageUrl,
    questions,
    setQuestions,
    streak
  } = useStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [highlight, setHighlight] = useState<{ bbox?: [number, number, number, number] }>();
  const [accuracy, setAccuracy] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showEnd, setShowEnd] = useState(false);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const tfWorkerRef = useRef<Worker>();
  const ocrWorkerRef = useRef<Worker>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const { count, running, startCountdown } = useCountdown(3, () => {
    runAnalysis();
  });

  const currentQuestion = questions[questionIndex];

  const offline = typeof window !== "undefined" && !navigator.onLine;

  useEffect(() => {
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  useEffect(() => {
    return () => {
      closeCamera();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currentQuestion) return;
    setSecondsLeft(currentQuestion.timer ?? 10);
    startTimeRef.current = Date.now();
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestion]);

  const totalQuestions = questions.length;

  const isFinished = showEnd || (totalQuestions > 0 && questionIndex >= totalQuestions);

  const prepareWorkers = () => {
    if (!tfWorkerRef.current) {
      tfWorkerRef.current = new Worker(new URL("../../../lib/tfworker.ts", import.meta.url), {
        type: "module"
      });
    }
    if (!ocrWorkerRef.current) {
      ocrWorkerRef.current = new Worker(
        new URL("../../../lib/tesseract.worker.ts", import.meta.url),
        {
          type: "module"
        }
      );
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
    } catch (error) {
      console.error("Camera error", error, "Hint: allow camera permissions in the browser.");
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg"));
    if (!blob) return;
    closeCamera();
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    await handleFile(file);
  };

  const handleFile = async (file: File) => {
    resetGame();
    setShowEnd(false);
    setCorrectCount(0);
    setAccuracy(0);
    setOpen(false);
    setStatusHint(null);
    prepareWorkers();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const blobUrl = URL.createObjectURL(file);
    objectUrlRef.current = blobUrl;
    setImageUrl(blobUrl);
    storeFile(file).catch((error) => {
      console.error("Store file error", error, "Hint: check /api/upload and permissions.");
    });
    startCountdown();
  };

  const runAnalysis = async () => {
    if (!imageUrl) return;
    setLoading(true);
    setStatusHint("Analyzing image...");
    try {
      const img = await loadImage(imageUrl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      if (!canvas.width || !canvas.height) {
        throw new Error("Image dimensions are zero");
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const objects = await detectObjects(imageData);
      const texts = await detectText(imageData);
      const payload: DetectionPayload = { objects, texts };
      const result = await generateQuizFromImage(payload);
      const enriched = normalizeQuestions(result.questions ?? []).map(
        (q: GameQuestion, index: number) => ({
          ...q,
          bbox: objects[index]?.bbox
        })
      );
      setQuestions(enriched);
      setQuestionIndex(0);
    } catch (error) {
      console.error("Module1 analysis error", error, "Hint: check Ollama and TF model load.");
      setStatusHint("Analysis failed. Check console for remediation hints.");
    } finally {
      setLoading(false);
    }
  };

  const detectObjects = (imageData: ImageData): Promise<DetectedObject[]> => {
    return new Promise((resolve) => {
      if (!tfWorkerRef.current) return resolve([]);
      const timeout = window.setTimeout(() => resolve([]), 8000);
      tfWorkerRef.current.onmessage = (event) => {
        clearTimeout(timeout);
        const predictions = event.data.predictions as Array<{
          class: string;
          bbox: [number, number, number, number];
        }>;
        const objects = predictions.map((pred) => ({
          label: pred.class,
          color: averageColor(imageData, pred.bbox),
          bbox: pred.bbox
        }));
        resolve(objects);
      };
      tfWorkerRef.current.onerror = () => {
        clearTimeout(timeout);
        resolve([]);
      };
      tfWorkerRef.current.postMessage({ imageData });
    });
  };

  const detectText = (imageData: ImageData): Promise<string[]> => {
    return new Promise((resolve) => {
      if (!ocrWorkerRef.current) return resolve([]);
      const timeout = window.setTimeout(() => resolve([]), 8000);
      ocrWorkerRef.current.onmessage = (event) => {
        clearTimeout(timeout);
        const text = String(event.data.text ?? "");
        const lines = text
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
        resolve(lines);
      };
      ocrWorkerRef.current.onerror = () => {
        clearTimeout(timeout);
        resolve([]);
      };
      ocrWorkerRef.current.postMessage({ imageData });
    });
  };

  const averageColor = (imageData: ImageData, bbox: [number, number, number, number]) => {
    const [x, y, w, h] = bbox;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = Math.max(0, Math.floor(y)); i < Math.min(imageData.height, y + h); i += 4) {
      for (let j = Math.max(0, Math.floor(x)); j < Math.min(imageData.width, x + w); j += 4) {
        const idx = (i * imageData.width + j) * 4;
        r += imageData.data[idx];
        g += imageData.data[idx + 1];
        b += imageData.data[idx + 2];
        count += 1;
      }
    }
    if (!count) return "#34d399";
    const toHex = (val: number) => val.toString(16).padStart(2, "0");
    return `#${toHex(Math.round(r / count))}${toHex(Math.round(g / count))}${toHex(
      Math.round(b / count)
    )}`;
  };

  const normalizeQuestions = (items: GameQuestion[]) => {
    const fallbackOptions = ["A", "B", "C", "D"];
    return items.map((item) => {
      const options = Array.isArray(item.options) ? [...item.options] : [];
      while (options.length < 4) {
        options.push(fallbackOptions[options.length]);
      }
      const trimmed = options.slice(0, 4);
      const answerIndex =
        Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex < 4
          ? item.answerIndex
          : 0;
      return {
        ...item,
        q: String(item.q ?? "Choose the best answer."),
        options: trimmed,
        answerIndex
      };
    });
  };

  const loadImage = (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const timeout = window.setTimeout(() => reject(new Error("Image load timeout")), 8000);
      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Image load failed"));
      };
      img.src = src;
    });
  };

  const handleAnswer = (index: number) => {
    if (!currentQuestion) return;
    const isCorrect = index === currentQuestion.answerIndex;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    if (isCorrect) {
      const gain = Math.max(10, 100 - elapsed * 10);
      addScore(gain);
      addXp(10);
      setCorrectCount(nextCorrectCount);
    } else {
      setLives(Math.max(0, lives - 1));
    }
    setHighlight({ bbox: currentQuestion.bbox });
    setTimeout(() => {
      setHighlight(undefined);
      const nextIndex = questionIndex + 1;
      if (nextIndex >= totalQuestions || lives - (isCorrect ? 0 : 1) <= 0) {
        endRound(nextIndex, nextCorrectCount);
      } else {
        setQuestionIndex(nextIndex);
      }
    }, 1500);
  };

  const endRound = async (nextIndex: number, correctTotal: number) => {
    const totalAnswered = Math.max(nextIndex, totalQuestions);
    const acc = totalAnswered ? Math.round((correctTotal / totalAnswered) * 100) : 0;
    setAccuracy(acc);
    setShowEnd(true);
    await saveScore(acc);
  };

  const saveScore = async (acc: number) => {
    const payload = {
      user_id: "local",
      module: "module1",
      score,
      accuracy: acc,
      created_at: new Date().toISOString()
    };
    if (!isSupabaseConfigured) {
      console.error("Supabase not configured", "Hint: set NEXT_PUBLIC_SUPABASE_URL and ANON KEY.");
      return;
    }
    if (offline) {
      await queueWrite({ table: "scores", payload });
      return;
    }
    const { error } = await supabase.from("scores").insert(payload);
    if (error) {
      console.error("Score sync error", error, "Hint: verify Supabase schema.");
      await queueWrite({ table: "scores", payload });
    }
  };

  const statusLabel = useMemo(() => {
    if (offline) return "Offline";
    if (loading) return "Syncing";
    return "Online";
  }, [offline, loading]);

  return (
    <main className="min-h-screen px-6 py-8">
      <TopBar />
      <div className="mt-6 flex items-center justify-between">
        <Link href="/" className="btn btn-circle btn-ghost" aria-label="Back home">
          Back
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">{statusLabel}</span>
          <Hearts lives={lives} />
        </div>
      </div>

      <section className="mt-6 grid gap-6">
        <div className="relative">
          <ImageCanvas imageUrl={imageUrl} highlight={highlight} />
          {currentQuestion && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
          )}
          <Countdown count={count} visible={running} />
          <QuestionOverlay question={currentQuestion} onAnswer={handleAnswer} secondsLeft={secondsLeft} />
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-300">Score</p>
              <p className="text-3xl font-semibold text-white">{score}</p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="btn rounded-full bg-emerald-400 text-black"
              aria-label="Open Picture Challenge"
            >
              Picture Challenge
            </button>
          </div>
          {statusHint && <p className="mt-2 text-sm text-amber-200">{statusHint}</p>}
        </div>
      </section>

      <Modal
        open={open}
        title="New Challenge"
        onClose={() => {
          closeCamera();
          setOpen(false);
        }}
      >
        <div className="grid gap-4">
          {!cameraOpen && (
            <button
              onClick={openCamera}
              className="btn rounded-full bg-emerald-400 text-black"
              aria-label="Take photo"
            >
              Take Photo
            </button>
          )}
          {cameraOpen && (
            <div className="grid gap-3">
              <video ref={videoRef} className="w-full rounded-2xl bg-black" playsInline />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={capturePhoto}
                  className="btn rounded-full bg-emerald-400 text-black"
                  aria-label="Capture photo"
                >
                  Capture
                </button>
                <button onClick={closeCamera} className="btn rounded-full btn-ghost" aria-label="Close camera">
                  Cancel
                </button>
              </div>
            </div>
          )}
          <label className="btn rounded-full bg-base-200 text-white" aria-label="Upload from gallery">
            Upload from Gallery
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
          <div
            className="rounded-2xl border border-dashed border-emerald-400/60 bg-base-200/40 p-6 text-center text-sm text-white/70"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            aria-label="Drag and drop image"
          >
            Drag and drop image here
          </div>
        </div>
      </Modal>

      {isFinished && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/80">
          <div className="card-surface w-full max-w-md p-6 text-center">
            <h2 className="text-xl font-semibold text-white">Round Complete</h2>
            <div className="mt-4 rounded-full border border-emerald-400/60 px-6 py-4 text-4xl text-emerald-300">
              {score}
            </div>
            <p className="mt-3 text-sm text-white/70">Accuracy {accuracy}%</p>
            <p className="mt-1 text-xs text-emerald-200">Streak {streak}</p>
            <div className="mt-6 grid gap-3">
              <button
                onClick={() => {
                  resetGame();
                  setShowEnd(false);
                  setQuestionIndex(0);
                  setCorrectCount(0);
                  setAccuracy(0);
                }}
                className="btn rounded-full bg-emerald-400 text-black"
                aria-label="Play again"
              >
                Play again
              </button>
              <button
                onClick={() => {
                  resetGame();
                  setImageUrl(undefined);
                  setQuestions([]);
                  setShowEnd(false);
                  setCorrectCount(0);
                  setAccuracy(0);
                }}
                className="btn rounded-full btn-ghost text-white"
                aria-label="New image"
              >
                New image
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
