"use client";

import { useEffect, useReducer, useRef } from "react";
import { LessonShell } from "@/components/LessonShell";
import { ReadingScreen } from "@/components/ReadingScreen";
import { MCQuestionScreen } from "@/components/MCQuestionScreen";
import { RemediationScreen } from "@/components/RemediationScreen";
import { SimulationScreen } from "@/components/SimulationScreen";
import { VoiceTutorScreen } from "@/components/VoiceTutorScreen";
import { CompletionScreen } from "@/components/CompletionScreen";
import {
  currentEntry,
  initialLessonState,
  LessonAction,
  LessonEntry,
  lessonReducer,
  progressFor,
} from "@/lib/lessonMachine";
import { curriculum } from "@/lib/curriculum";

export default function LessonPage() {
  const [state, dispatch] = useReducer(lessonReducer, initialLessonState);
  const progress = progressFor(currentEntry(state).step);

  // Auto-scroll the newly-appended entry into view when entries.length grows.
  const lastEntryRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(state.entries.length);
  useEffect(() => {
    if (state.entries.length > prevLengthRef.current) {
      lastEntryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    prevLengthRef.current = state.entries.length;
  }, [state.entries.length]);

  return (
    <LessonShell progress={progress}>
      {state.entries.map((entry, idx) => {
        const isCurrent = idx === state.entries.length - 1;
        return (
          <div
            key={idx}
            ref={isCurrent ? lastEntryRef : undefined}
            className="scroll-mt-4"
          >
            {renderEntry(entry, {
              frozen: !isCurrent,
              dispatch,
            })}
          </div>
        );
      })}
    </LessonShell>
  );
}

function renderEntry(
  entry: LessonEntry,
  opts: { frozen: boolean; dispatch: React.Dispatch<LessonAction> },
) {
  const { frozen, dispatch } = opts;
  switch (entry.step) {
    case "intro":
      return (
        <div className="flex flex-col items-start gap-5 max-w-md">
          <p className="text-base leading-relaxed text-text-muted">
            Let&apos;s get started. This will take about 5-10 minutes.
          </p>
          {!frozen && (
            <button
              type="button"
              onClick={() => dispatch({ type: "ADVANCE" })}
              className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
            >
              Begin
            </button>
          )}
        </div>
      );

    case "reading1":
      return (
        <ReadingScreen
          section={curriculum.reading1}
          frozen={frozen}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
        />
      );

    case "mcq1":
      return (
        <MCQuestionScreen
          mcq={curriculum.mcq1}
          frozen={frozen}
          answeredOptionId={entry.answeredOptionId}
          onAnswer={(opt) =>
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id })
          }
        />
      );

    case "remediation1": {
      if (!entry.lastWrongOptionId) return null;
      const wrongOption = curriculum.mcq1.options.find(
        (o) => o.id === entry.lastWrongOptionId,
      );
      if (!wrongOption) return null;
      return (
        <RemediationScreen
          wrongOption={wrongOption}
          frozen={frozen}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
        />
      );
    }

    case "simulation":
      return (
        <SimulationScreen
          frozen={frozen}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
        />
      );

    case "mcq2":
      return (
        <MCQuestionScreen
          mcq={curriculum.mcq2}
          frozen={frozen}
          answeredOptionId={entry.answeredOptionId}
          onAnswer={(opt) =>
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq2", optionId: opt.id })
          }
        />
      );

    case "remediation2": {
      if (!entry.lastWrongOptionId) return null;
      const wrongOption = curriculum.mcq2.options.find(
        (o) => o.id === entry.lastWrongOptionId,
      );
      if (!wrongOption) return null;
      return (
        <RemediationScreen
          wrongOption={wrongOption}
          frozen={frozen}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
        />
      );
    }

    case "voiceTutor":
      return (
        <VoiceTutorScreen
          frozen={frozen}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
        />
      );

    case "done":
      return (
        <CompletionScreen
          frozen={frozen}
          onRestart={() => dispatch({ type: "RESTART_LESSON" })}
        />
      );
  }
}
