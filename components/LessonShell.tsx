import { ReactNode } from "react";

interface LessonShellProps {
  children: ReactNode;
  progress?: { current: number; total: number };
}

export function LessonShell({ children, progress }: LessonShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-white text-slate-900">
      <header className="px-4 pt-4 pb-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          Electrical Fundamentals
        </div>
        <h1 className="text-base font-semibold">Neutral &amp; Ground Bonding</h1>
        {progress && (
          <div
            className="mt-2 h-1 w-full bg-slate-200 rounded overflow-hidden"
            role="progressbar"
            aria-label="Lesson progress"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.current}
          >
            <div
              className="h-full bg-slate-900 transition-all"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
        )}
      </header>
      <main className="flex-1 px-4 pb-6 flex flex-col gap-4">{children}</main>
    </div>
  );
}
