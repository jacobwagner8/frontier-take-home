"use client";

import { useReducer } from "react";
import { LessonShell } from "@/components/LessonShell";
import { ReadingScreen } from "@/components/ReadingScreen";
import { MCQuestionScreen } from "@/components/MCQuestionScreen";
import { RemediationScreen } from "@/components/RemediationScreen";
import { SimulationScreen } from "@/components/SimulationScreen";
import { VoiceTutorScreen } from "@/components/VoiceTutorScreen";
import { CompletionScreen } from "@/components/CompletionScreen";
import {
  initialLessonState,
  lessonReducer,
  progressFor,
} from "@/lib/lessonMachine";
import { useLessonAnalytics } from "@/lib/useLessonAnalytics";
import { curriculum } from "@/lib/curriculum";

export default function LessonPage() {
  const [state, dispatch] = useReducer(lessonReducer, initialLessonState);
  const analytics = useLessonAnalytics(state.step);
  const progress = progressFor(state.step);
  const goBack = () => dispatch({ type: "GO_BACK" });

  return (
    <LessonShell progress={progress}>
      {state.step === "intro" && (
        <div className="flex-1 flex flex-col justify-center items-start gap-5 max-w-md">
          <p className="text-base leading-relaxed text-text-muted">
            Let&apos;s get started. This will take about 5-10 minutes.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADVANCE" })}
            className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
          >
            Begin
          </button>
        </div>
      )}

      {state.step === "reading1" && (
        <ReadingScreen
          section={curriculum.reading1}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onBack={goBack}
        />
      )}

      {state.step === "mcq1" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1", opt.isCorrect);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id });
          }}
          onBack={goBack}
        />
      )}

      {state.step === "remediation1" && state.lastWrongOptionId && (
        <RemediationScreen
          wrongOption={
            curriculum.mcq1.options.find(
              (o) => o.id === state.lastWrongOptionId,
            )!
          }
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onChatTurn={() => analytics.recordChatTurn("remediation1")}
        />
      )}

      {state.step === "simulation" && (
        <SimulationScreen
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onBack={goBack}
          onToggle={analytics.recordToggle}
        />
      )}

      {state.step === "mcq2" && (
        <MCQuestionScreen
          mcq={curriculum.mcq2}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq2", opt.isCorrect);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq2", optionId: opt.id });
          }}
          onBack={goBack}
        />
      )}

      {state.step === "remediation2" && state.lastWrongOptionId && (
        <RemediationScreen
          wrongOption={
            curriculum.mcq2.options.find(
              (o) => o.id === state.lastWrongOptionId,
            )!
          }
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onChatTurn={() => analytics.recordChatTurn("remediation2")}
        />
      )}

      {state.step === "voiceTutor" && (
        <VoiceTutorScreen
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onBack={goBack}
          onChatTurn={() => analytics.recordChatTurn("finalRecap")}
        />
      )}

      {state.step === "done" && (
        <CompletionScreen
          onRestart={() => dispatch({ type: "RESTART_LESSON" })}
          snapshot={analytics.snapshot}
        />
      )}
    </LessonShell>
  );
}
