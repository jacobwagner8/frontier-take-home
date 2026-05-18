"use client";

import type { MCQOption } from "@/lib/curriculum.types";

interface Props {
  wrongOption: MCQOption;
  onAdvance: () => void;
  onAskFollowUp?: () => void;
}

export function RemediationScreen({
  wrongOption,
  onAdvance,
  onAskFollowUp,
}: Props) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4"
    >
      <div className="text-xs uppercase tracking-wide text-rose-600 font-semibold">
        Not quite
      </div>
      <p className="text-base leading-relaxed whitespace-pre-wrap">
        {wrongOption.remediation}
      </p>
      <div className="flex gap-2 justify-end">
        {onAskFollowUp && (
          <button
            type="button"
            onClick={onAskFollowUp}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 font-medium"
          >
            Ask a follow-up
          </button>
        )}
        <button
          type="button"
          onClick={onAdvance}
          className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
        >
          Try again
        </button>
      </div>
    </section>
  );
}
