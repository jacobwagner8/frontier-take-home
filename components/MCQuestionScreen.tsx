"use client";

import { useId, useState } from "react";
import type { MCQ, MCQOption } from "@/lib/curriculum.types";

interface Props {
  mcq: MCQ;
  onAnswer: (option: MCQOption) => void;
  /** When true, lock the radio selection and hide the Submit button. */
  frozen?: boolean;
  /** The option the user submitted (only meaningful when frozen). */
  answeredOptionId?: string;
}

export function MCQuestionScreen({
  mcq,
  onAnswer,
  frozen = false,
  answeredOptionId,
}: Props) {
  const [interactiveId, setInteractiveId] = useState<string | null>(null);
  const promptId = useId();

  const selectedId = frozen ? (answeredOptionId ?? null) : interactiveId;

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
              className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl border text-[15px] transition-colors ${
                isSelected
                  ? "border-brand bg-brand-soft/40"
                  : "border-border bg-surface"
              } ${frozen ? "cursor-default" : "cursor-pointer hover:bg-canvas"}`}
            >
              <input
                type="radio"
                name={mcq.id}
                value={opt.id}
                checked={isSelected}
                onChange={() => setInteractiveId(opt.id)}
                disabled={frozen}
                className="accent-brand w-4 h-4"
              />
              <span className="text-text">{opt.text}</span>
            </label>
          );
        })}
      </div>
      {!frozen && (
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
      )}
    </section>
  );
}
