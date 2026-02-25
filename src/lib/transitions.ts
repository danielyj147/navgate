import {
  OVERNIGHT_START,
  BUSINESS_START,
  OPEN_START,
} from "@/data/rules";
import { EasternTime, isWeekend } from "./time-utils";

interface NextTransition {
  label: string;
  minutesUntil: number;
}

function minutesUntil(current: number, target: number): number {
  if (target > current) return target - current;
  return target + 24 * 60 - current;
}

export function getNextTransition(et: EasternTime): NextTransition {
  const { minutesSinceMidnight: mins, dayOfWeek } = et;
  const weekend = isWeekend(dayOfWeek);

  if (mins >= OVERNIGHT_START && mins < BUSINESS_START) {
    return {
      label: weekend ? "All lots open" : "Business hours start",
      minutesUntil: minutesUntil(mins, BUSINESS_START),
    };
  }

  if (!weekend && mins >= BUSINESS_START && mins < OPEN_START) {
    return {
      label: "Open hours start",
      minutesUntil: minutesUntil(mins, OPEN_START),
    };
  }

  // Open hours or weekend daytime → next overnight
  return {
    label: "Overnight restriction",
    minutesUntil: minutesUntil(mins, OVERNIGHT_START),
  };
}

export function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
