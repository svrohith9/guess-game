"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setFlipped(false);
    setSeconds(15);
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

  return (
    <div className="relative">
      {timed && (
        <div className="absolute right-4 top-4 text-xs text-emerald-200">00:{seconds}</div>
      )}
      <div
        className={`card-surface p-6 ${reduceMotion ? "" : "transition-transform duration-500"} ${
          flipped ? "rotate-y-180" : "rotate-y-0"
        }`}
        style={{ transformStyle: reduceMotion ? "flat" : "preserve-3d" }}
      >
        <div className="space-y-4" style={{ backfaceVisibility: "hidden" }}>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Prompt</p>
          <h2 className="text-xl font-semibold text-white">{card.front}</h2>
          <div className="mt-6 grid gap-3">
            {derivedOptions.map((option, index) => (
              <button
                key={`${option}-${index}`}
                onClick={() => onSubmit(index === answerIndex)}
                className="btn rounded-full bg-base-200 text-white"
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
        <div
          className="absolute inset-0 p-6 text-white"
          style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Answer</p>
          <h2 className="mt-4 text-xl font-semibold">{card.back}</h2>
          <button
            onClick={() => setFlipped(false)}
            className="btn btn-ghost mt-6"
            aria-label="Back to prompt"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
