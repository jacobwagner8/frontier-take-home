import Link from "next/link";
import { LessonShell } from "@/components/LessonShell";

export default function Home() {
  return (
    <LessonShell>
      <div className="flex-1 flex flex-col justify-center items-start gap-6">
        <p className="text-lg leading-relaxed">
          A 5-10 minute lesson on why a residential electrical system bonds
          neutral and ground at exactly one point — and what physically goes
          wrong if there is more than one.
        </p>
        <Link
          href="/lesson"
          className="px-5 py-3 rounded-lg bg-slate-900 text-white font-medium"
        >
          Start lesson
        </Link>
      </div>
    </LessonShell>
  );
}
