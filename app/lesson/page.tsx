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
import { curriculum } from "@/lib/curriculum";

export default function LessonPage() {
  const [state, dispatch] = useReducer(lessonReducer, initialLessonState);
  const progress = progressFor(state.step);

  return (
    <LessonShell progress={progress}>
      {state.step === "intro" && (
        <div className="flex-1 flex flex-col justify-center items-start gap-4">
          <p className="text-lg leading-relaxed">
            Let&apos;s get started. This will take about 5-10 minutes.
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADVANCE" })}
            className="px-5 py-3 rounded-lg bg-slate-900 text-white font-medium"
          >
            Begin
          </button>
        </div>
      )}

      {state.step === "reading1" && (
        <ReadingScreen
          section={curriculum.reading1}
          onAdvance={() => dispatch({ type: "ADVANCE" })}
        />
      )}

      {state.step === "mcq1" && (
        <MCQuestionScreen
          mcq={curriculum.mcq1}
          onAnswer={(opt) =>
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq1", optionId: opt.id })
          }
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
        />
      )}

      {state.step === "simulation" && (
        <SimulationScreen onAdvance={() => dispatch({ type: "ADVANCE" })} />
      )}

      {state.step === "mcq2" && (
        <MCQuestionScreen
          mcq={curriculum.mcq2}
          onAnswer={(opt) =>
            dispatch({ type: "ANSWER_MCQ", mcqId: "mcq2", optionId: opt.id })
          }
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
        />
      )}

      {state.step === "voiceTutor" && (
        <VoiceTutorScreen onAdvance={() => dispatch({ type: "ADVANCE" })} />
      )}

      {state.step === "done" && (
        <CompletionScreen
          onRestart={() => dispatch({ type: "RESTART_LESSON" })}
        />
      )}
    </LessonShell>
  );
}
