import { BrandMark } from "./BrandMark";

interface Props {
  onRestart: () => void;
}

export function CompletionScreen({ onRestart }: Props) {
  return (
    <section className="flex-1 flex flex-col justify-center items-start gap-5 max-w-md">
      <BrandMark size={36} />
      <h2 className="text-2xl font-semibold text-text-strong leading-tight tracking-[-0.01em]">
        Lesson complete
      </h2>
      <p className="text-base leading-relaxed text-text-muted">
        Quick recap to take with you: in a residential system, neutral and
        ground are bonded at exactly one point — the service disconnect. Any
        second bond downstream creates parallel return paths through the EGC
        and bonded metal, putting load current and touch voltage where they
        should never be.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="px-5 py-3 rounded-2xl border border-border text-text-strong font-medium hover:bg-canvas"
      >
        Restart lesson
      </button>
    </section>
  );
}
