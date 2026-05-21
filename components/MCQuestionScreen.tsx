"use client";

import { useId, useState } from "react";
import type { MCQ, MCQOption } from "@/lib/curriculum.types";
import { LessonFooter } from "./LessonFooter";
import { FollowUpChat } from "./FollowUpChat";

interface Props {
  mcq: MCQ;
  onAnswer: (option: MCQOption) => void;
  onWrongAttempt?: (option: MCQOption) => void;
  onChatTurn?: () => void;
  onBack?: () => void;
}

export function MCQuestionScreen({
  mcq,
  onAnswer,
  onWrongAttempt,
  onChatTurn,
  onBack,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const promptId = useId();

  const submitted = submittedId
    ? (mcq.options.find((o) => o.id === submittedId) ?? null)
    : null;
  const phase: "picking" | "wrong" | "correct" =
    submitted === null ? "picking" : submitted.isCorrect ? "correct" : "wrong";

  function handleSubmit() {
    const opt = mcq.options.find((o) => o.id === selectedId);
    if (!opt) return;
    setSubmittedId(opt.id);
    if (!opt.isCorrect) onWrongAttempt?.(opt);
  }

  function handleTryAgain() {
    setSelectedId(null);
    setSubmittedId(null);
    setChatOpen(false);
  }

  function handleNext() {
    if (submitted && submitted.isCorrect) onAnswer(submitted);
  }

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
          const isSubmitted = submittedId === opt.id;
          let visual = "border-border bg-surface hover:bg-canvas";
          if (phase === "picking" && isSelected) {
            visual = "border-brand bg-brand-soft/40";
          } else if (isSubmitted && phase === "wrong") {
            visual = "border-danger bg-danger/5";
          } else if (isSubmitted && phase === "correct") {
            visual = "border-brand bg-brand-soft/40";
          }
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl border text-[15px] transition-colors ${visual} ${
                phase === "picking" ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <input
                type="radio"
                name={mcq.id}
                value={opt.id}
                checked={isSelected}
                disabled={phase !== "picking"}
                onChange={() => setSelectedId(opt.id)}
                className="accent-brand w-4 h-4"
              />
              <span className="text-text">{opt.text}</span>
            </label>
          );
        })}
      </div>

      {phase === "wrong" && submitted && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 p-4 rounded-2xl bg-danger/5 border border-danger/20"
        >
          <div className="text-[11px] uppercase tracking-[0.08em] text-danger font-semibold">
            Not quite
          </div>
          <p className="text-[15px] leading-[1.6] text-text whitespace-pre-wrap">
            {submitted.remediation}
          </p>
        </div>
      )}

      {phase === "correct" && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 p-4 rounded-2xl bg-brand-soft/40 border border-brand/30"
        >
          <div className="text-[11px] uppercase tracking-[0.08em] text-brand font-semibold">
            Correct
          </div>
          <p className="text-[15px] leading-[1.6] text-text whitespace-pre-wrap">
            {mcq.rationale}
          </p>
        </div>
      )}

      <LessonFooter onBack={phase === "picking" ? onBack : undefined}>
        {phase === "picking" && (
          <button
            type="button"
            disabled={!selectedId}
            onClick={handleSubmit}
            className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)] disabled:bg-border disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
          >
            Submit
          </button>
        )}
        {phase === "wrong" && (
          <div className="flex gap-2">
            {submitted?.misconceptionTag && (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
              >
                Ask a follow-up
              </button>
            )}
            <button
              type="button"
              onClick={handleTryAgain}
              className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
            >
              Try again
            </button>
          </div>
        )}
        {phase === "correct" && (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
          >
            Next
          </button>
        )}
      </LessonFooter>

      {chatOpen && submitted?.misconceptionTag && (
        <FollowUpChat
          misconceptionTag={submitted.misconceptionTag}
          onClose={() => setChatOpen(false)}
          onUserSent={onChatTurn}
        />
      )}
    </section>
  );
}
