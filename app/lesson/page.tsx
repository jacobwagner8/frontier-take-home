"use client";

import { useReducer } from "react";
import { LessonShell } from "@/components/LessonShell";
import { ReadingScreen } from "@/components/ReadingScreen";
import { MCQuestionScreen } from "@/components/MCQuestionScreen";
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
            analytics.recordMcqAttempt("mcq1", true);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1" });
          }}
          onWrongAttempt={() => analytics.recordMcqAttempt("mcq1", false)}
          onChatTurn={() => analytics.recordChatTurn("remediation1")}
          onBack={goBack}
        />
      )}

      {state.step === "mcq1b" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1b}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1b", true);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1b" });
          }}
          onWrongAttempt={() => analytics.recordMcqAttempt("mcq1b", false)}
          onChatTurn={() => analytics.recordChatTurn("remediation1b")}
          onBack={goBack}
        />
      )}

      {state.step === "mcq1c" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1c}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1c", true);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1c" });
          }}
          onWrongAttempt={() => analytics.recordMcqAttempt("mcq1c", false)}
          onChatTurn={() => analytics.recordChatTurn("remediation1c")}
          onBack={goBack}
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
            analytics.recordMcqAttempt("mcq2", true);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq2" });
          }}
          onWrongAttempt={() => analytics.recordMcqAttempt("mcq2", false)}
          onChatTurn={() => analytics.recordChatTurn("remediation2")}
          onBack={goBack}
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
        <CompletionScreen snapshot={analytics.snapshot} />
      )}
    </LessonShell>
  );
}
