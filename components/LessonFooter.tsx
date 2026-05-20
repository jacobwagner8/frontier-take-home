import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onBack?: () => void;
}

/** Footer row shared across lesson stages. Renders an optional Back button
 * on the left and the caller-provided primary action(s) on the right.
 * Uses items-end so a stacked right-side column (e.g. SimulationScreen's
 * hint above Continue) aligns the Back button with the bottom button. */
export function LessonFooter({ children, onBack }: Props) {
  return (
    <div
      className={`flex items-end gap-3 ${onBack ? "justify-between" : "justify-end"}`}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
        >
          Back
        </button>
      )}
      {children}
    </div>
  );
}
