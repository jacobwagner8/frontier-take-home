"use client";

import { useId, useState } from "react";
import type { MCQ, MCQOption } from "@/lib/curriculum.types";

interface Props {
  mcq: MCQ;
  onAnswer: (option: MCQOption) => void;
  onBack?: () => void;
}

export function MCQuestionScreen({ mcq, onAnswer, onBack }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const promptId = useId();

  return (
    <section className="flex flex-col gap-5">
      <h2
        id={promptId}
        className="text-xl font-semibold text-text-strong leading-snug tracking-[-0.005em]"
      >
        {mcq.prompt}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={promptId}
        className="flex flex-col gap-2.5"
      >
        {mcq.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 cursor-pointer w-full px-4 py-3.5 rounded-2xl border text-[15px] transition-colors ${
                isSelected
                  ? "border-brand bg-brand-soft/40"
                  : "border-border bg-surface hover:bg-canvas"
              }`}
            >
              <input
                type="radio"
                name={mcq.id}
                value={opt.id}
                checked={isSelected}
                onChange={() => setSelectedId(opt.id)}
                className="accent-brand w-4 h-4"
              />
              <span className="text-text">{opt.text}</span>
            </label>
          );
        })}
      </div>
      <div className="flex justify-between items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => {
            const opt = mcq.options.find((o) => o.id === selectedId);
            if (opt) onAnswer(opt);
          }}
          className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)] disabled:bg-border disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </section>
  );
}
