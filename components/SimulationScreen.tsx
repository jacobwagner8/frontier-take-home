"use client";

import { useState } from "react";
import { curriculum } from "@/lib/curriculum";
import { Toggle } from "./Toggle";

interface Props {
  onAdvance: () => void;
}

export function SimulationScreen({ onAdvance }: Props) {
  const [secondBond, setSecondBond] = useState(false);
  const caption = secondBond
    ? curriculum.simulationCaptions.twoBond
    : curriculum.simulationCaptions.oneBond;

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-text-strong leading-tight tracking-[-0.005em]">
        See what happens with two bonds
      </h2>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          role="img"
          aria-label={
            secondBond
              ? "Diagram with a second neutral-to-ground bond at the subpanel; current now flows on both the neutral feeder and the EGC feeder."
              : "Diagram with a single neutral-to-ground bond at the main panel; current flows only on the neutral feeder."
          }
        >
          {/* Main panel */}
          <text
            x="80"
            y="18"
            textAnchor="middle"
            fontSize="10"
            fill="#0C0A09"
            fontWeight="700"
            letterSpacing="0.06em"
          >
            MAIN PANEL
          </text>
          <rect
            x="20"
            y="26"
            width="120"
            height="156"
            rx="6"
            fill="#FFFFFF"
            stroke="#1C1917"
            strokeWidth="2"
          />
          <rect x="28" y="34" width="104" height="6" fill="#0F766E" />

          {/* Breaker rows */}
          <rect x="28" y="46" width="44" height="10" rx="2" fill="#E7E5E4" />
          <rect x="78" y="46" width="44" height="10" rx="2" fill="#E7E5E4" />
          <rect x="28" y="60" width="44" height="10" rx="2" fill="#E7E5E4" />
          <rect x="78" y="60" width="44" height="10" rx="2" fill="#E7E5E4" />

          {/* Neutral bus */}
          <rect x="28" y="86" width="104" height="8" rx="2" fill="#A8A29E" />
          {[36, 56, 76, 96, 116].map((cx) => (
            <circle key={`n-${cx}`} cx={cx} cy="90" r="1.2" fill="#FFFFFF" />
          ))}
          <text
            x="80"
            y="106"
            textAnchor="middle"
            fontSize="8"
            fill="#57534E"
          >
            Neutral bus
          </text>

          {/* EGC bus */}
          <rect x="28" y="144" width="104" height="8" rx="2" fill="#0F766E" />
          {[36, 56, 76, 96, 116].map((cx) => (
            <circle key={`e-${cx}`} cx={cx} cy="148" r="1.2" fill="#FFFFFF" />
          ))}
          <text
            x="80"
            y="164"
            textAnchor="middle"
            fontSize="8"
            fill="#0F766E"
          >
            EGC bus
          </text>

          {/* Main bonding jumper */}
          <rect x="132" y="88" width="6" height="64" rx="2" fill="#DC2626" />
          <circle cx="135" cy="90" r="1.5" fill="#FFFFFF" />
          <circle cx="135" cy="150" r="1.5" fill="#FFFFFF" />
          <text
            x="148"
            y="124"
            fontSize="8"
            fill="#DC2626"
            fontWeight="700"
          >
            Main bond
          </text>

          {/* Neutral feeder (always animates) */}
          <line
            x1="142"
            y1="90"
            x2="240"
            y2="90"
            stroke="#A8A29E"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            className="current-flow-n"
          />
          <text
            x="190"
            y="82"
            textAnchor="middle"
            fontSize="8"
            fill="#57534E"
          >
            Neutral feeder
          </text>

          {/* EGC feeder (animates only when secondBond) */}
          <line
            x1="142"
            y1="150"
            x2="240"
            y2="150"
            stroke="#0F766E"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            className={secondBond ? "current-flow-egc" : ""}
          />
          <text
            x="190"
            y="166"
            textAnchor="middle"
            fontSize="8"
            fill="#0F766E"
          >
            EGC feeder
          </text>
          {secondBond && (
            <text
              x="190"
              y="180"
              textAnchor="middle"
              fontSize="9"
              fill="#DC2626"
              fontWeight="700"
            >
              ⚠ Current now flowing on the EGC
            </text>
          )}

          {/* Subpanel */}
          <text
            x="280"
            y="32"
            textAnchor="middle"
            fontSize="10"
            fill="#0C0A09"
            fontWeight="700"
            letterSpacing="0.06em"
          >
            SUBPANEL
          </text>
          <rect
            x="240"
            y="40"
            width="80"
            height="140"
            rx="5"
            fill="#FFFFFF"
            stroke="#1C1917"
            strokeWidth="2"
          />
          <rect x="246" y="46" width="68" height="5" fill="#0F766E" />
          <rect x="246" y="86" width="68" height="6" rx="2" fill="#A8A29E" />
          <rect x="246" y="146" width="68" height="6" rx="2" fill="#0F766E" />

          {/* Optional second bond */}
          {secondBond && (
            <>
              <rect
                x="314"
                y="88"
                width="6"
                height="64"
                rx="2"
                fill="#DC2626"
              />
              <circle cx="317" cy="90" r="1.5" fill="#FFFFFF" />
              <circle cx="317" cy="150" r="1.5" fill="#FFFFFF" />
            </>
          )}

          {/* Load */}
          <text
            x="280"
            y="216"
            textAnchor="middle"
            fontSize="9"
            fill="#0C0A09"
            fontWeight="600"
          >
            Load
          </text>
          <rect
            x="262"
            y="190"
            width="36"
            height="18"
            rx="3"
            fill="#F5F5F4"
            stroke="#1C1917"
            strokeWidth="1.2"
          />
          <circle
            cx="280"
            cy="199"
            r="3"
            fill="none"
            stroke="#1C1917"
            strokeWidth="1"
          />
          <line
            x1="280"
            y1="152"
            x2="280"
            y2="190"
            stroke="#A8A29E"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="rounded-2xl border border-border bg-surface px-4 py-2">
        <Toggle
          checked={secondBond}
          onChange={setSecondBond}
          label="Add a second N-G bond at the subpanel"
        />
      </div>

      <div className="flex gap-3 p-4 bg-surface-muted rounded-2xl">
        <div className="w-[3px] bg-brand rounded-sm flex-shrink-0" />
        <p
          className="text-[14px] leading-[1.55] text-text-muted"
          aria-live="polite"
        >
          {caption}
        </p>
      </div>

      <button
        type="button"
        onClick={onAdvance}
        className="self-end px-5 py-3 rounded-2xl bg-brand text-white font-semibold shadow-[0_1px_2px_rgba(15,118,110,0.2)]"
      >
        Continue
      </button>
    </section>
  );
}
