import { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

interface LessonShellProps {
  children: ReactNode;
  progress?: { current: number; total: number };
}

export function LessonShell({ children, progress }: LessonShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-canvas text-text">
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur px-4 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BrandMark />
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
              Electrical Fundamentals
            </div>
          </div>
          {progress && (
            <div className="text-[11px] text-text-subtle tabular-nums">
              {progress.current} / {progress.total}
            </div>
          )}
        </div>
        <h1 className="text-sm font-semibold text-text-strong">
          Neutral &amp; Ground Bonding
        </h1>
        {progress && (
          <div
            className="mt-3 h-1 w-full bg-border rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Lesson progress"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
          >
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
        )}
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-8 flex flex-col gap-4">
        {children}
      </main>
    </div>
  );
}
