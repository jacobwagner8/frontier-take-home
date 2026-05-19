"use client";

import { useState } from "react";
import { curriculum } from "@/lib/curriculum";
import { Toggle } from "./Toggle";

interface Props {
  onAdvance: () => void;
}

export function SimulationScreen({ onAdvance }: Props) {
  const [secondBond, setSecondBond] = useState(false);
  const { oneBond, twoBond } = curriculum.simulationCaptions;

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-text-strong leading-tight tracking-[-0.005em]">
        See what happens with two bonds
      </h2>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <svg
          viewBox="0 0 360 320"
          className="w-full h-auto"
          role="img"
          aria-label={
            secondBond
              ? "Diagram with a second neutral-to-ground bond at the subpanel; current now flows on both the neutral feeder and the EGC feeder. Downstream, an appliance bonded to the subpanel EGC sits at about 5 V above earth, while a nearby sink stays at 0 V via its own water-pipe ground. A person touching both is now part of a circuit between them."
              : "Diagram with a single neutral-to-ground bond at the main panel; current flows only on the neutral feeder. Downstream, an appliance bonded to the subpanel EGC and a nearby sink grounded to earth are at the same potential, so a person touching both is safe."
          }
        >
          {/* Main panel */}
          <text
            x="80"
            y="18"
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-strong)"
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
            fill="var(--color-surface)"
            stroke="var(--color-text)"
            strokeWidth="2"
          />
          <rect x="28" y="34" width="104" height="6" fill="var(--color-brand)" />

          {/* Breaker rows */}
          <rect x="28" y="46" width="44" height="10" rx="2" fill="var(--color-border)" />
          <rect x="78" y="46" width="44" height="10" rx="2" fill="var(--color-border)" />
          <rect x="28" y="60" width="44" height="10" rx="2" fill="var(--color-border)" />
          <rect x="78" y="60" width="44" height="10" rx="2" fill="var(--color-border)" />

          {/* Neutral bus */}
          <rect x="28" y="86" width="104" height="8" rx="2" fill="var(--color-neutral-wire)" />
          {[36, 56, 76, 96, 116].map((cx) => (
            <circle key={`n-${cx}`} cx={cx} cy="90" r="1.2" fill="var(--color-surface)" />
          ))}
          <text
            x="80"
            y="106"
            textAnchor="middle"
            fontSize="8"
            fill="var(--color-text-muted)"
          >
            Neutral bus
          </text>

          {/* EGC bus */}
          <rect x="28" y="144" width="104" height="8" rx="2" fill="var(--color-brand)" />
          {[36, 56, 76, 96, 116].map((cx) => (
            <circle key={`e-${cx}`} cx={cx} cy="148" r="1.2" fill="var(--color-surface)" />
          ))}
          <text
            x="80"
            y="164"
            textAnchor="middle"
            fontSize="8"
            fill="var(--color-brand)"
          >
            EGC bus
          </text>

          {/* Main bonding jumper */}
          <rect x="132" y="88" width="6" height="64" rx="2" fill="var(--color-danger)" />
          <circle cx="135" cy="90" r="1.5" fill="var(--color-surface)" />
          <circle cx="135" cy="150" r="1.5" fill="var(--color-surface)" />
          <text
            x="148"
            y="124"
            fontSize="8"
            fill="var(--color-danger)"
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
            stroke="var(--color-neutral-wire)"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            className="current-flow-n"
          />
          <text
            x="190"
            y="82"
            textAnchor="middle"
            fontSize="8"
            fill="var(--color-text-muted)"
          >
            Neutral feeder
          </text>

          {/* EGC feeder (animates only when secondBond) */}
          <line
            x1="142"
            y1="150"
            x2="240"
            y2="150"
            stroke="var(--color-brand)"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            className={secondBond ? "current-flow-egc" : ""}
          />
          <text
            x="190"
            y="166"
            textAnchor="middle"
            fontSize="8"
            fill="var(--color-brand)"
          >
            EGC feeder
          </text>
          {/* Subpanel */}
          <text
            x="280"
            y="32"
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-strong)"
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
            fill="var(--color-surface)"
            stroke="var(--color-text)"
            strokeWidth="2"
          />
          <rect x="246" y="46" width="68" height="5" fill="var(--color-brand)" />
          <rect x="246" y="86" width="68" height="6" rx="2" fill="var(--color-neutral-wire)" />
          <rect x="246" y="146" width="68" height="6" rx="2" fill="var(--color-brand)" />

          {/* Optional second bond */}
          {secondBond && (
            <>
              <rect
                x="314"
                y="88"
                width="6"
                height="64"
                rx="2"
                fill="var(--color-danger)"
              />
              <circle cx="317" cy="90" r="1.5" fill="var(--color-surface)" />
              <circle cx="317" cy="150" r="1.5" fill="var(--color-surface)" />

              {/* Callout naming the schema */}
              <line
                x1="317"
                y1="152"
                x2="317"
                y2="226"
                stroke="var(--color-danger)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="200"
                y1="226"
                x2="317"
                y2="226"
                stroke="var(--color-danger)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <text
                x="200"
                y="240"
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-danger)"
                fontWeight="700"
                letterSpacing="0.08em"
              >
                PARALLEL RETURN PATH
              </text>
            </>
          )}

          {/* === DOWNSTREAM SCENE === */}
          {/* Branch-circuit neutral from subpanel to appliance */}
          <line
            x1="320"
            y1="90"
            x2="338"
            y2="90"
            stroke="var(--color-neutral-wire)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="current-flow-n"
          />
          <line
            x1="338"
            y1="90"
            x2="338"
            y2="285"
            stroke="var(--color-neutral-wire)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="current-flow-n"
          />
          <line
            x1="338"
            y1="285"
            x2="255"
            y2="285"
            stroke="var(--color-neutral-wire)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="current-flow-n"
          />

          {/* Branch-circuit EGC from subpanel EGC bus to appliance metal frame */}
          <line
            x1="320"
            y1="150"
            x2="348"
            y2="150"
            stroke="var(--color-brand)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className={secondBond ? "current-flow-egc" : ""}
          />
          <line
            x1="348"
            y1="150"
            x2="348"
            y2="268"
            stroke="var(--color-brand)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className={secondBond ? "current-flow-egc" : ""}
          />
          <line
            x1="348"
            y1="268"
            x2="255"
            y2="268"
            stroke="var(--color-brand)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className={secondBond ? "current-flow-egc" : ""}
          />

          {/* Appliance */}
          <rect
            x="205"
            y="265"
            width="50"
            height="40"
            rx="3"
            fill="var(--color-surface-muted)"
            stroke={
              secondBond ? "var(--color-danger)" : "var(--color-text)"
            }
            strokeWidth={secondBond ? "1.8" : "1.2"}
          />
          <circle
            cx="230"
            cy="285"
            r="6"
            fill="none"
            stroke="var(--color-text)"
            strokeWidth="0.8"
          />
          <text
            x="230"
            y="316"
            textAnchor="middle"
            fontSize="9"
            fill="var(--color-text-strong)"
            fontWeight="600"
          >
            Appliance
          </text>
          {secondBond && (
            <text
              x="230"
              y="259"
              textAnchor="middle"
              fontSize="9"
              fill="var(--color-danger)"
              fontWeight="700"
            >
              ≈ 5 V
            </text>
          )}

          {/* Person */}
          <circle
            cx="280"
            cy="272"
            r="4"
            fill="none"
            stroke="var(--color-text)"
            strokeWidth="1.2"
          />
          <line
            x1="280"
            y1="276"
            x2="280"
            y2="298"
            stroke="var(--color-text)"
            strokeWidth="1.2"
          />
          {/* Arms — turn red when there's a voltage between the things being touched */}
          <line
            x1="280"
            y1="283"
            x2="258"
            y2="290"
            stroke={
              secondBond ? "var(--color-danger)" : "var(--color-text)"
            }
            strokeWidth={secondBond ? "1.8" : "1.2"}
          />
          <line
            x1="280"
            y1="283"
            x2="302"
            y2="290"
            stroke={
              secondBond ? "var(--color-danger)" : "var(--color-text)"
            }
            strokeWidth={secondBond ? "1.8" : "1.2"}
          />
          <line
            x1="280"
            y1="298"
            x2="275"
            y2="312"
            stroke="var(--color-text)"
            strokeWidth="1.2"
          />
          <line
            x1="280"
            y1="298"
            x2="285"
            y2="312"
            stroke="var(--color-text)"
            strokeWidth="1.2"
          />
          {secondBond && (
            <text
              x="294"
              y="270"
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-danger)"
              fontWeight="700"
            >
              ⚡
            </text>
          )}

          {/* Sink (true earth via local water pipe) */}
          <rect
            x="305"
            y="270"
            width="40"
            height="32"
            rx="2"
            fill="var(--color-surface-muted)"
            stroke="var(--color-text)"
            strokeWidth="1.2"
          />
          <text
            x="325"
            y="316"
            textAnchor="middle"
            fontSize="9"
            fill="var(--color-text-strong)"
            fontWeight="600"
          >
            Sink
          </text>
          <text
            x="325"
            y="262"
            textAnchor="middle"
            fontSize="8"
            fill="var(--color-text-muted)"
            fontWeight="600"
          >
            0 V (earth)
          </text>
          {/* Pipe + ground symbol */}
          <line
            x1="325"
            y1="302"
            x2="325"
            y2="307"
            stroke="var(--color-text)"
            strokeWidth="1.2"
          />
          <line
            x1="318"
            y1="307"
            x2="332"
            y2="307"
            stroke="var(--color-text)"
            strokeWidth="1.5"
          />
          <line
            x1="320"
            y1="310"
            x2="330"
            y2="310"
            stroke="var(--color-text)"
            strokeWidth="1"
          />
          <line
            x1="322"
            y1="313"
            x2="328"
            y2="313"
            stroke="var(--color-text)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {secondBond && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-danger/30 bg-danger/10 text-danger text-[13px] font-semibold"
        >
          <span aria-hidden="true">⚠</span>
          <span>Current now flowing on the EGC</span>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface px-4 py-2">
        <Toggle
          checked={secondBond}
          onChange={setSecondBond}
          label="Add a second N-G bond at the subpanel"
        />
      </div>

      {secondBond ? (
        <div
          className="flex flex-col gap-3 p-4 bg-surface-muted rounded-2xl"
          aria-live="polite"
        >
          <div className="text-[11px] uppercase tracking-[0.08em] text-text-strong font-semibold">
            What changed?
          </div>
          <ul className="flex flex-col gap-2.5">
            {(
              [
                { label: "Mechanism", text: twoBond.mechanism },
                { label: "Consequence", text: twoBond.consequence },
                { label: "Hazard", text: twoBond.hazard },
              ] as const
            ).map((point) => (
              <li
                key={point.label}
                className="flex gap-3 text-[14px] leading-[1.55] text-text-muted"
              >
                <span className="font-semibold text-text-strong shrink-0 w-[6.5rem]">
                  {point.label}
                </span>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex gap-3 p-4 bg-surface-muted rounded-2xl">
          <div className="w-[3px] bg-brand rounded-sm flex-shrink-0" />
          <p
            className="text-[14px] leading-[1.55] text-text-muted"
            aria-live="polite"
          >
            {oneBond}
          </p>
        </div>
      )}

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
