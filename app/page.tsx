import Link from "next/link";
import { LessonShell } from "@/components/LessonShell";

export default function Home() {
  return (
    <LessonShell>
      <div className="flex-1 flex flex-col justify-center items-start gap-6 max-w-md">
        <h2 className="text-2xl font-semibold text-text-strong leading-tight tracking-[-0.01em]">
          One bond, exactly one place.
        </h2>
        <p className="text-base leading-relaxed text-text-muted">
          A 5-10 minute lesson on why a residential electrical system bonds
          neutral and ground at exactly one point — and what physically goes
          wrong if there is more than one.
        </p>
        <Link
          href="/lesson"
          className="px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)] hover:opacity-95"
        >
          Start lesson
        </Link>
      </div>
    </LessonShell>
  );
}
