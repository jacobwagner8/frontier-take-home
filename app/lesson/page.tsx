import Link from "next/link";
import { LessonShell } from "@/components/LessonShell";

export default function LessonPage() {
  return (
    <LessonShell>
      <div className="flex-1 flex flex-col justify-center items-start gap-4">
        <p className="text-lg leading-relaxed">
          The lesson surface is under construction. The reading, comprehension
          checks, simulation, and voice-tutor recap will live here.
        </p>
        <Link
          href="/"
          className="text-slate-600 underline underline-offset-4"
        >
          Back to start
        </Link>
      </div>
    </LessonShell>
  );
}
