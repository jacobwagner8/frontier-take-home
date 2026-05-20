import Image from "next/image";
import type { ReadingSection } from "@/lib/curriculum.types";

interface Props {
  section: ReadingSection;
  onAdvance: () => void;
  ctaLabel?: string;
  frozen?: boolean;
}

export function ReadingScreen({
  section,
  onAdvance,
  ctaLabel = "Continue",
  frozen = false,
}: Props) {
  return (
    <article className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-text-strong leading-tight tracking-[-0.005em]">
        {section.title}
      </h2>
      <p className="text-[15px] leading-[1.6] text-text whitespace-pre-wrap">
        {section.body}
      </p>
      {section.imageSrc && (
        <div className="rounded-2xl overflow-hidden border border-border bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <Image
            src={section.imageSrc}
            alt={section.imageAlt ?? ""}
            width={800}
            height={500}
            className="w-full h-auto"
          />
        </div>
      )}
      {!frozen && (
        <button
          type="button"
          onClick={onAdvance}
          className="self-end px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
        >
          {ctaLabel}
        </button>
      )}
    </article>
  );
}
