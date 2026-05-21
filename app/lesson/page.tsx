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

      {state.step === "mcq1b" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1b}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1b", opt.isCorrect);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1b", optionId: opt.id });
          }}
          onBack={goBack}
        />
      )}

      {state.step === "remediation1b" && state.lastWrongOptionId && (
        <RemediationScreen
          wrongOption={
            curriculum.mcq1b.options.find(
              (o) => o.id === state.lastWrongOptionId,
            )!
          }
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onChatTurn={() => analytics.recordChatTurn("remediation1b")}
        />
      )}

      {state.step === "mcq1c" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1c}
          onAnswer={(opt) => {
            analytics.recordMcqAttempt("mcq1c", opt.isCorrect);
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1c", optionId: opt.id });
          }}
          onBack={goBack}
        />
      )}

      {state.step === "remediation1c" && state.lastWrongOptionId && (
        <RemediationScreen
          wrongOption={
            curriculum.mcq1c.options.find(
              (o) => o.id === state.lastWrongOptionId,
            )!
          }
          onAdvance={() => dispatch({ type: "ADVANCE" })}
          onChatTurn={() => analytics.recordChatTurn("remediation1c")}
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
        <CompletionScreen snapshot={analytics.snapshot} />
      )}
    </LessonShell>
  );
}
