import Image from "next/image";
import type { ReadingSection } from "@/lib/curriculum.types";

interface Props {
  section: ReadingSection;
  onAdvance: () => void;
  ctaLabel?: string;
}

export function ReadingScreen({
  section,
  onAdvance,
  ctaLabel = "Continue",
}: Props) {
  return (
    <article className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{section.title}</h2>
      {section.imageSrc && (
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <Image
            src={section.imageSrc}
            alt={section.imageAlt ?? ""}
            width={800}
            height={500}
            className="w-full h-auto"
          />
        </div>
      )}
      <p className="leading-relaxed whitespace-pre-wrap">{section.body}</p>
      <button
        type="button"
        onClick={onAdvance}
        className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
      >
        {ctaLabel}
      </button>
    </article>
  );
}
