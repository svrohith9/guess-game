"use client";

import { useEffect, useRef, useState } from "react";
import { FlashCard as CardType } from "@/lib/store";

type FlashCardProps = {
  card: CardType;
  onSubmit: (correct: boolean) => void;
  timed: boolean;
};

export default function FlashCard({ card, onSubmit, timed }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [seconds, setSeconds] = useState(15);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [locked, setLocked] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    setFlipped(false);
    setSeconds(15);
    setFeedback(null);
    setLocked(false);
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, [card]);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!timed) return;
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSubmit(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [card, timed, onSubmit]);

  const baseOptions = card.options && card.options.length ? card.options : [];
  const trueFalseOptions = ["True", "False"];
  const derivedOptions =
    card.type === "truefalse"
      ? trueFalseOptions
      : baseOptions.length >= 4
      ? baseOptions.slice(0, 4)
      : [card.back, "Option B", "Option C", "Option D"];
  const answerIndex =
    typeof card.answerIndex === "number"
      ? card.answerIndex
      : card.type === "truefalse"
      ? card.back.trim().toLowerCase().startsWith("f")
        ? 1
        : 0
      : 0;

  const handleOption = (index: number) => {
    if (locked) return;
    setLocked(true);
    const isCorrect = index === answerIndex;
    if (isCorrect) {
      setFeedback("correct");
      const id = window.setTimeout(() => {
        setFeedback(null);
        setLocked(false);
        onSubmit(true);
      }, 900);
      timersRef.current.push(id);
      return;
    }
    setFeedback("wrong");
    setFlipped(true);
    const id = window.setTimeout(() => {
      setFlipped(false);
      setFeedback(null);
      setLocked(false);
      onSubmit(false);
    }, 1400);
    timersRef.current.push(id);
  };

  return (
    <div className="relative flip-card">
      {timed && (
        <div className="absolute right-4 top-4 text-xs text-emerald-200">00:{seconds}</div>
      )}
      <div
        className={`card-surface p-6 flip-inner ${reduceMotion ? "" : "transition-transform duration-500"} ${
          flipped ? "flip-show-back" : ""
        }`}
      >
        {feedback === "correct" && (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <div className="graffiti-pop rounded-full bg-emerald-400/90 px-6 py-3 text-lg font-semibold text-black">
              Correct!
            </div>
          </div>
        )}
        <div className="space-y-4 flip-face flip-front">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Prompt</p>
          <h2 className="text-xl font-semibold text-white">{card.front}</h2>
          <div className="mt-6 grid gap-3">
            {derivedOptions.map((option, index) => (
              <button
                key={`${option}-${index}`}
                onClick={() => handleOption(index)}
                disabled={locked}
                className={`btn rounded-full text-white ${
                  feedback === "wrong" && index === answerIndex
                    ? "bg-emerald-400 text-black"
                    : feedback === "wrong" && index !== answerIndex
                    ? "bg-red-500/70"
                    : "bg-base-200"
                }`}
                aria-label={`Answer option ${index + 1}`}
              >
                {option}
              </button>
            ))}
            <button
              onClick={() => setFlipped(true)}
              className="btn btn-ghost"
              aria-label="Flip card"
            >
              Flip Card
            </button>
          </div>
        </div>
        <div className="absolute inset-0 p-6 text-white flip-face flip-back">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Correct answer</p>
          <h2 className="mt-4 text-2xl font-semibold">
            {derivedOptions[answerIndex] ?? card.back}
          </h2>
        </div>
      </div>
    </div>
  );
}
