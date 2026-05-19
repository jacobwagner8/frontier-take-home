interface Props {
  onRestart: () => void;
}

export function CompletionScreen({ onRestart }: Props) {
  return (
    <section className="flex-1 flex flex-col justify-center items-start gap-4">
      <h2 className="text-xl font-semibold">Lesson complete</h2>
      <p className="leading-relaxed">
        Quick recap to take with you: in a residential system, neutral and
        ground are bonded at exactly one point — the service disconnect. Any
        second bond downstream creates parallel return paths through the EGC
        and bonded metal, putting load current and touch voltage where they
        should never be.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="px-4 py-2.5 rounded-lg border border-slate-300 font-medium"
      >
        Restart lesson
      </button>
    </section>
  );
}
