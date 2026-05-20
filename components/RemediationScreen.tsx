"use client";

import { useState } from "react";
import type { MCQOption } from "@/lib/curriculum.types";
import { FollowUpChat } from "./FollowUpChat";

interface Props {
  wrongOption: MCQOption;
  onAdvance: () => void;
  frozen?: boolean;
}

export function RemediationScreen({
  wrongOption,
  onAdvance,
  frozen = false,
}: Props) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <div role="status" aria-live="polite" className="flex flex-col gap-3">
        <div className="text-[11px] uppercase tracking-[0.08em] text-danger font-semibold">
          Not quite
        </div>
        <p className="text-[15px] leading-[1.6] text-text whitespace-pre-wrap">
          {wrongOption.remediation}
        </p>
      </div>
      {!frozen && (
        <div className="flex gap-2 justify-end">
          {wrongOption.misconceptionTag && (
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
            onClick={onAdvance}
            className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
          >
            Try again
          </button>
        </div>
      )}
      {chatOpen && wrongOption.misconceptionTag && (
        <FollowUpChat
          misconceptionTag={wrongOption.misconceptionTag}
          onClose={() => setChatOpen(false)}
        />
      )}
    </section>
  );
}
