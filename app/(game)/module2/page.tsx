"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import FlashCardView from "./FlashCard";
import { useDocParser } from "./Parser";
import { generateFlashcardsFromText } from "@/lib/ollama";
import { useSM2 } from "@/hooks/useSM2";
import type { FlashCard as FlashCardType } from "@/lib/store";
import { useStore } from "@/lib/store";
import { flushQueue, queueWrite, saveState, loadState } from "@/lib/storage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const PROGRESS_KEY = "doc-progress";
const VALID_TYPES: FlashCardType["type"][] = ["definition", "fill", "mcq", "truefalse"];

export default function Module2Page() {
  const { parseFile } = useDocParser();
  const { initCard, gradeCard } = useSM2();
  const {
    flashcards,
    setFlashcards,
    currentIndex,
    setCurrentIndex,
    settings,
    updateSettings,
    addXp
  } =
    useStore();
  const [loading, setLoading] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [palette, setPalette] = useState<"default" | "colorblind">("default");
  const offline = typeof window !== "undefined" && !navigator.onLine;

  useEffect(() => {
    const onOnline = () => flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  useEffect(() => {
    loadState(PROGRESS_KEY, { flashcards: [], currentIndex: 0, fileName: null }).then((data) => {
      if (data.flashcards?.length) {
        setFlashcards(data.flashcards);
        setCurrentIndex(data.currentIndex);
        setFileName(data.fileName);
        setSessionActive(true);
      }
    });
  }, [setFlashcards, setCurrentIndex]);

  useEffect(() => {
    const saved = localStorage.getItem("gg-palette");
    if (saved === "colorblind") setPalette("colorblind");
  }, []);

  useEffect(() => {
    localStorage.setItem("gg-palette", palette);
    if (palette === "colorblind") {
      document.documentElement.style.setProperty("--fallback-b1", "#0a0f1f");
      document.documentElement.style.setProperty("--fallback-bc", "#e2f2ff");
    } else {
      document.documentElement.style.removeProperty("--fallback-b1");
      document.documentElement.style.removeProperty("--fallback-bc");
    }
  }, [palette]);

  useEffect(() => {
    saveState(PROGRESS_KEY, { flashcards, currentIndex, fileName });
  }, [flashcards, currentIndex, fileName]);

  const currentCard = flashcards[currentIndex];

  const statusLabel = useMemo(() => {
    if (offline) return "Offline";
    if (loading) return "Syncing";
    return "Online";
  }, [offline, loading]);

  const handleFile = async (file: File) => {
    setLoading(true);
    setErrorHint(null);
    setFileName(file.name);
    setSessionActive(false);
    try {
      const rawText = await parseFile(file);
      const result = await generateFlashcardsFromText(rawText);
      const selected = (result.flashcards ?? [])
        .filter(
          (card): card is FlashCardType =>
            VALID_TYPES.includes(card.type as FlashCardType["type"])
        )
        .filter((card) => settings.types.includes(card.type))
        .slice(0, settings.count)
        .map((card) => ({ ...card, sm2: initCard() }));
      if (!selected.length) {
        setErrorHint("No flashcards generated. Try a clearer document or check Ollama output.");
      }
      setFlashcards(selected);
      setCurrentIndex(0);
      setCompleted(false);
    } catch (error) {
      console.error("Module2 parse error", error, "Hint: check Ollama and PDF parsing.");
      setErrorHint("Parser failed. Check console for remediation hints.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (correct: boolean) => {
    if (!currentCard) return;
    const quality = correct ? 4 : 2;
    if (correct) addXp(10);
    const updated = gradeCard(currentCard.sm2 ?? initCard(), quality);
    const nextCards = flashcards.map((card, index) =>
      index === currentIndex ? { ...card, sm2: updated } : card
    );
    setFlashcards(nextCards);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= flashcards.length) {
      setCompleted(true);
      setSessionActive(false);
      await saveScore();
      return;
    }
    setCurrentIndex(nextIndex);
  };

  const saveScore = async () => {
    const payload = {
      user_id: "local",
      module: "module2",
      score: flashcards.length * 100,
      accuracy: 100,
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

  const exportCsv = () => {
    const rows = ["front,back,type"].concat(
      flashcards.map((card) =>
        [card.front, card.back, card.type]
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(",")
      )
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flashcards.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen px-6 py-8">
      <TopBar />
      <div className="mt-6 flex items-center justify-between">
        <Link href="/" className="btn btn-circle btn-ghost" aria-label="Back home">
          Back
        </Link>
        <span className="text-xs text-white/60">{statusLabel}</span>
      </div>

      <section className="mt-6 grid gap-6">
        <div className="card-surface p-6">
          <h2 className="text-xl font-semibold text-white">Upload Source Material</h2>
          <p className="mt-2 text-sm text-white/70">
            Feed the AI your documents to generate your next battle scenario.
          </p>
          <label
            className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-400/60 bg-base-200/40 px-4 py-10 text-center"
            aria-label="Dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
          >
            <div className="text-emerald-400 text-3xl">Upload</div>
            <p className="mt-2 text-white/80">Drag & Drop here</p>
            <p className="text-xs text-white/50">or browse your files</p>
            <p className="mt-2 text-xs text-white/50">Max file size: 10MB</p>
            <input
              type="file"
              accept=".pdf,.txt,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
          {fileName && <p className="mt-3 text-xs text-white/60">Loaded: {fileName}</p>}
        {errorHint && <p className="mt-2 text-sm text-amber-200">{errorHint}</p>}
      </div>

      <div className="card-surface p-6">
        <h3 className="text-lg font-semibold text-white">Configure Challenge</h3>
          <div className="mt-4 grid gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Question Styles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["fill", "truefalse", "mcq"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const active = settings.types.includes(type);
                      updateSettings({
                        types: active
                          ? settings.types.filter((t) => t !== type)
                          : [...settings.types, type]
                      });
                    }}
                    className={`btn btn-sm rounded-full ${
                      settings.types.includes(type) ? "bg-emerald-400 text-black" : "btn-ghost"
                    }`}
                    aria-label={`Toggle ${type}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Session Length</p>
              <input
                type="range"
                min={5}
                max={50}
                value={settings.count}
                onChange={(event) => updateSettings({ count: Number(event.target.value) })}
                className="range range-success mt-2"
                aria-label="Session length"
              />
              <p className="text-xs text-white/60">Cards per session: {settings.count}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Game Mode</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => updateSettings({ timed: false })}
                  className={`btn btn-sm rounded-full ${
                    !settings.timed ? "bg-emerald-400 text-black" : "btn-ghost"
                  }`}
                  aria-label="Relaxed mode"
                >
                  Relaxed
                </button>
                <button
                  onClick={() => updateSettings({ timed: true })}
                  className={`btn btn-sm rounded-full ${
                    settings.timed ? "bg-emerald-400 text-black" : "btn-ghost"
                  }`}
                  aria-label="Timed mode"
                >
                  Time Attack
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Accessibility</p>
              <button
                onClick={() => setPalette(palette === "default" ? "colorblind" : "default")}
                className="btn btn-sm mt-2 rounded-full bg-base-200"
                aria-label="Toggle color-blind palette"
              >
                {palette === "default" ? "Enable color-blind palette" : "Disable color-blind palette"}
              </button>
            </div>
          </div>
          <button
            onClick={() => setSessionActive(true)}
            className="btn mt-6 rounded-full bg-emerald-400 text-black"
            aria-label="Start Challenge"
            disabled={!flashcards.length}
          >
            Start Challenge
          </button>
        </div>

        {currentCard && sessionActive && !completed && (
          <FlashCardView card={currentCard} onSubmit={handleAnswer} timed={settings.timed} />
        )}

        {completed && (
          <div className="card-surface p-6 text-center">
            <h2 className="text-xl font-semibold text-white">Session Complete</h2>
            <p className="mt-2 text-sm text-white/70">Mastery bar</p>
            <div className="mt-4 h-2 rounded-full bg-base-200">
              <div className="h-2 w-3/4 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-4 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Cards to review</p>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                {flashcards.slice(0, 3).map((card) => (
                  <li key={card.front}>{card.front}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={exportCsv}
              className="btn mt-6 rounded-full bg-emerald-400 text-black"
              aria-label="Export CSV"
            >
              Export to CSV
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
