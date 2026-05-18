"use client";

import { useState } from "react";
import { curriculum } from "@/lib/curriculum";

interface Props {
  onAdvance: () => void;
}

export function SimulationScreen({ onAdvance }: Props) {
  const [secondBond, setSecondBond] = useState(false);
  const caption = secondBond
    ? curriculum.simulationCaptions.twoBond
    : curriculum.simulationCaptions.oneBond;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        See what happens with two bonds
      </h2>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <svg
          viewBox="0 0 800 500"
          className="w-full h-auto"
          role="img"
          aria-label={
            secondBond
              ? "Diagram with a second neutral-to-ground bond at the subpanel; current now flows on both the neutral feeder and the EGC feeder."
              : "Diagram with a single neutral-to-ground bond at the main panel; current flows only on the neutral feeder."
          }
        >
          {/* Main panel */}
          <rect
            x="40"
            y="60"
            width="240"
            height="380"
            rx="8"
            stroke="#0f172a"
            strokeWidth="3"
            fill="white"
          />
          <text
            x="160"
            y="90"
            textAnchor="middle"
            fontSize="18"
            fontWeight="600"
          >
            MAIN PANEL
          </text>

          {/* N bus + EGC bus inside main */}
          <line
            x1="80"
            y1="150"
            x2="240"
            y2="150"
            stroke="#475569"
            strokeWidth="4"
          />
          <text
            x="160"
            y="140"
            textAnchor="middle"
            fontSize="12"
            fill="#475569"
          >
            Neutral bus
          </text>
          <line
            x1="80"
            y1="280"
            x2="240"
            y2="280"
            stroke="#16a34a"
            strokeWidth="4"
          />
          <text
            x="160"
            y="300"
            textAnchor="middle"
            fontSize="12"
            fill="#16a34a"
          >
            EGC bus
          </text>

          {/* Always-on main bonding jumper */}
          <line
            x1="240"
            y1="150"
            x2="240"
            y2="280"
            stroke="#dc2626"
            strokeWidth="3"
          />
          <circle cx="240" cy="150" r="5" fill="#dc2626" />
          <circle cx="240" cy="280" r="5" fill="#dc2626" />
          <text
            x="270"
            y="220"
            fontSize="11"
            fill="#dc2626"
            fontWeight="600"
          >
            Main bond
          </text>

          {/* Feeder wires to subpanel */}
          <line
            x1="280"
            y1="150"
            x2="520"
            y2="150"
            stroke="#475569"
            strokeWidth="4"
            strokeDasharray="6 4"
          />
          <text
            x="400"
            y="140"
            textAnchor="middle"
            fontSize="12"
            fill="#475569"
          >
            Neutral feeder
          </text>
          <line
            x1="280"
            y1="280"
            x2="520"
            y2="280"
            stroke="#16a34a"
            strokeWidth="4"
            strokeDasharray="6 4"
          />
          <text
            x="400"
            y="305"
            textAnchor="middle"
            fontSize="12"
            fill="#16a34a"
          >
            EGC feeder
          </text>

          {/* Subpanel */}
          <rect
            x="520"
            y="100"
            width="200"
            height="300"
            rx="8"
            stroke="#0f172a"
            strokeWidth="3"
            fill="white"
          />
          <text
            x="620"
            y="130"
            textAnchor="middle"
            fontSize="16"
            fontWeight="600"
          >
            SUBPANEL
          </text>
          <line
            x1="540"
            y1="180"
            x2="700"
            y2="180"
            stroke="#475569"
            strokeWidth="3"
          />
          <line
            x1="540"
            y1="280"
            x2="700"
            y2="280"
            stroke="#16a34a"
            strokeWidth="3"
          />

          {/* Optional second bond */}
          {secondBond && (
            <>
              <line
                x1="700"
                y1="180"
                x2="700"
                y2="280"
                stroke="#dc2626"
                strokeWidth="3"
              />
              <circle cx="700" cy="180" r="5" fill="#dc2626" />
              <circle cx="700" cy="280" r="5" fill="#dc2626" />
              <text
                x="730"
                y="235"
                fontSize="11"
                fill="#dc2626"
                fontWeight="600"
              >
                Second
              </text>
              <text
                x="730"
                y="250"
                fontSize="11"
                fill="#dc2626"
                fontWeight="600"
              >
                bond
              </text>
            </>
          )}

          {/* Load */}
          <rect
            x="580"
            y="350"
            width="80"
            height="40"
            stroke="#0f172a"
            strokeWidth="2"
            fill="#f1f5f9"
          />
          <text x="620" y="375" textAnchor="middle" fontSize="11">
            Load
          </text>
          <line
            x1="620"
            y1="280"
            x2="620"
            y2="350"
            stroke="#475569"
            strokeWidth="2"
          />
        </svg>
      </div>

      <label className="flex items-center gap-3 select-none">
        <input
          type="checkbox"
          checked={secondBond}
          onChange={(e) => setSecondBond(e.target.checked)}
          className="h-5 w-5 accent-slate-900"
        />
        <span className="text-sm">
          Add a second N-G bond at the subpanel
        </span>
      </label>

      <p
        className="text-sm leading-relaxed text-slate-700"
        aria-live="polite"
      >
        {caption}
      </p>

      <button
        type="button"
        onClick={onAdvance}
        className="self-end px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
      >
        Continue
      </button>
    </section>
  );
}
