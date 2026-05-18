"use client";

import { useState } from "react";
import type { MCQ, MCQOption } from "@/lib/curriculum.types";

interface Props {
  mcq: MCQ;
  onAnswer: (option: MCQOption) => void;
}

export function MCQuestionScreen({ mcq, onAnswer }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{mcq.prompt}</h2>
      <ul role="radiogroup" aria-label={mcq.prompt} className="flex flex-col gap-2">
        {mcq.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <li key={opt.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedId(opt.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-base transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-100"
                    : "border-slate-200"
                }`}
              >
                {opt.text}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={!selectedId}
        onClick={() => {
          const opt = mcq.options.find((o) => o.id === selectedId);
          if (opt) onAnswer(opt);
        }}
        className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium disabled:bg-slate-300"
      >
        Submit
      </button>
    </section>
  );
}
