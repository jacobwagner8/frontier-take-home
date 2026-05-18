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
    <section className="flex flex-col gap-4">
      <h2 id={promptId} className="text-lg font-semibold">
        {mcq.prompt}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={promptId}
        className="flex flex-col gap-2"
      >
        {mcq.options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 cursor-pointer w-full px-4 py-3 rounded-lg border text-base transition ${
                isSelected
                  ? "border-slate-900 bg-slate-100"
                  : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                name={mcq.id}
                value={opt.id}
                checked={isSelected}
                onChange={() => setSelectedId(opt.id)}
                className="accent-slate-900"
              />
              <span>{opt.text}</span>
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
        className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium disabled:bg-slate-300"
      >
        Submit
      </button>
    </section>
  );
}
