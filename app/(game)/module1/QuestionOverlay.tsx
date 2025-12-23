"use client";

import { GameQuestion } from "@/lib/store";

type QuestionOverlayProps = {
  question?: GameQuestion;
  onAnswer: (index: number) => void;
  secondsLeft: number;
};

export default function QuestionOverlay({ question, onAnswer, secondsLeft }: QuestionOverlayProps) {
  if (!question) return null;
  return (
    <div className="absolute inset-x-4 bottom-6 rounded-3xl bg-base-200/80 p-5 text-white backdrop-blur">
      <div className="flex items-center justify-between text-xs text-emerald-200">
        <span>00:{String(secondsLeft).padStart(2, "0")}</span>
        <span className="uppercase tracking-[0.2em]">Question</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug">{question.q}</h3>
      <div className="mt-4 grid gap-2">
        {(question.options ?? []).map((option, index) => (
          <button
            key={option + index}
            onClick={() => onAnswer(index)}
            className="btn btn-ghost rounded-2xl justify-start bg-black/30 text-white hover:bg-emerald-400/80 hover:text-black"
            aria-label={`Answer option ${index + 1}`}
          >
            <span className="mr-3 text-sm text-white/50">{String.fromCharCode(65 + index)}</span>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
