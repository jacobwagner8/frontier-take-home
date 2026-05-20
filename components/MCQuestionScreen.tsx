"use client";

import { useId, useState } from "react";
import type { MCQ, MCQOption } from "@/lib/curriculum.types";

interface Props {
  mcq: MCQ;
  onAnswer: (option: MCQOption) => void;
}

export function MCQuestionScreen({ mcq, onAnswer }: Props) {
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
      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          const opt = mcq.options.find((o) => o.id === selectedId);
          if (opt) onAnswer(opt);
        }}
        className="self-end px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)] disabled:bg-border disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
      >
        Submit
      </button>
    </section>
  );
}
