"use client";

import { EasternTime } from "@/lib/time-utils";
import { getPeriodLabel } from "@/lib/availability";
import { getNextTransition, formatCountdown } from "@/lib/transitions";
import { isWeekend } from "@/lib/time-utils";

interface Props {
  easternTime: EasternTime;
  dark: boolean;
}

export default function TimeDisplay({ easternTime, dark }: Props) {
  const weekend = isWeekend(easternTime.dayOfWeek);
  const period = getPeriodLabel(easternTime.minutesSinceMidnight, weekend);
  const next = getNextTransition(easternTime);

  const bg = dark ? "#2a2a3d" : "#ffffff";
  const text = dark ? "#eaeaea" : "#1a1a1a";
  const textMuted = dark ? "#9999bb" : "#666";
  const border = dark ? "#3d3d55" : "#e5e5e5";

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 1000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: "10px 14px",
        textAlign: "right",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: text }}>
        {easternTime.formatted} ET
      </div>
      <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{period}</div>
      <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
        Next: {next.label} in {formatCountdown(next.minutesUntil)}
      </div>
    </div>
  );
}
