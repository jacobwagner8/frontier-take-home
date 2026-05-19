"use client";

import { useId } from "react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  name?: string;
}

export function Toggle({ checked, onChange, label, name }: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer select-none py-2"
    >
      <span className="relative inline-block w-9 h-[22px] flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className="absolute inset-0 rounded-full bg-border peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 transition-colors"
          aria-hidden="true"
        />
        <span
          className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-[14px]"
          aria-hidden="true"
        />
      </span>
      <span className="text-base text-text">{label}</span>
    </label>
  );
}
