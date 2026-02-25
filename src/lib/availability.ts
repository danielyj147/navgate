import { ParkingLot, LotStatus } from "@/types";
import {
  OVERNIGHT_START,
  BUSINESS_START,
  OPEN_START,
  TRANSITION_WINDOW,
} from "@/data/rules";
import { EasternTime, isWeekend } from "./time-utils";

type Period = "overnight" | "business" | "open";

function getCurrentPeriod(mins: number): Period {
  if (mins < OVERNIGHT_START || mins >= OVERNIGHT_START + 24 * 60) {
    // Before 3 AM wraps: treat as open hours extending from previous day
    return "open";
  }
  if (mins >= OVERNIGHT_START && mins < BUSINESS_START) return "overnight";
  if (mins >= BUSINESS_START && mins < OPEN_START) return "business";
  return "open";
}

export function getPeriodLabel(mins: number, weekend: boolean): string {
  if (weekend) {
    const period = getCurrentPeriod(mins);
    if (period === "overnight") return "Overnight (3-7 AM)";
    return "Weekend — All lots open";
  }
  const period = getCurrentPeriod(mins);
  switch (period) {
    case "overnight":
      return "Overnight (3-7 AM)";
    case "business":
      return "Business hours (7 AM-4:30 PM)";
    case "open":
      return "Open hours (4:30 PM-3 AM)";
  }
}

function minutesUntil(current: number, target: number): number {
  if (target > current) return target - current;
  return target + 24 * 60 - current; // wrap around midnight
}

export function getLotStatus(lot: ParkingLot, et: EasternTime): LotStatus {
  const { minutesSinceMidnight: mins, dayOfWeek } = et;
  const weekend = isWeekend(dayOfWeek);

  // Restricted lots are never available
  if (lot.category === "restricted") {
    return {
      color: "red",
      label: "Not available",
      reason: "Restricted — accessible parking only",
    };
  }

  const period = getCurrentPeriod(mins);

  // --- Overnight period (3:00 AM - 7:00 AM) ---
  if (period === "overnight") {
    const minsUntilBusinessStart = minutesUntil(mins, BUSINESS_START);

    if (lot.overnightExempt) {
      // Exempt lots stay available through overnight
      if (minsUntilBusinessStart <= TRANSITION_WINDOW) {
        // If employee lot, it's about to become unavailable at business hours
        if (lot.category === "employee" && !weekend) {
          return {
            color: "orange",
            label: "Unavailable soon",
            reason: `Employee lot — closes at 7:00 AM (${minsUntilBusinessStart} min)`,
          };
        }
      }
      return {
        color: "green",
        label: "Available",
        reason: "Overnight exempt — parking allowed 24/7",
      };
    }

    // Non-exempt lots during overnight
    if (minsUntilBusinessStart <= TRANSITION_WINDOW) {
      // About to exit overnight restriction
      if (lot.category === "student" || weekend) {
        return {
          color: "yellow",
          label: "Available soon",
          reason: `Available at 7:00 AM (${minsUntilBusinessStart} min)`,
        };
      }
      // Employee lots on weekday: business hours still restricted
      if (lot.category === "employee") {
        return {
          color: "red",
          label: "Not available",
          reason: "Employee lot — not available until 4:30 PM",
        };
      }
    }

    return {
      color: "red",
      label: "Not available",
      reason: "Overnight restriction (3-7 AM) — no parking",
    };
  }

  // --- Weekend (non-overnight) ---
  if (weekend) {
    // All non-restricted lots are available on weekends outside overnight
    const minsUntilOvernight = minutesUntil(mins, OVERNIGHT_START);
    if (
      minsUntilOvernight <= TRANSITION_WINDOW &&
      !lot.overnightExempt &&
      mins >= BUSINESS_START
    ) {
      return {
        color: "orange",
        label: "Unavailable soon",
        reason: `Overnight restriction at 3:00 AM (${minsUntilOvernight} min)`,
      };
    }
    return {
      color: "green",
      label: "Available",
      reason: "Weekend — all lots open",
    };
  }

  // --- Weekday business hours (7:00 AM - 4:30 PM) ---
  if (period === "business") {
    const minsUntilOpen = minutesUntil(mins, OPEN_START);

    if (lot.category === "student") {
      // Student lots are available during business hours
      return {
        color: "green",
        label: "Available",
        reason: "Student lot — available during business hours",
      };
    }

    // Employee lots not available during business hours
    if (minsUntilOpen <= TRANSITION_WINDOW) {
      return {
        color: "yellow",
        label: "Available soon",
        reason: `Open hours start at 4:30 PM (${minsUntilOpen} min)`,
      };
    }

    return {
      color: "red",
      label: "Not available",
      reason: "Employee lot — available after 4:30 PM",
    };
  }

  // --- Weekday open hours (4:30 PM - 3:00 AM) ---
  const minsUntilOvernight = minutesUntil(mins, OVERNIGHT_START);

  if (lot.category === "student") {
    return {
      color: "green",
      label: "Available",
      reason: "Student lot — always available",
    };
  }

  // Employee lots available during open hours
  if (!lot.overnightExempt && minsUntilOvernight <= TRANSITION_WINDOW) {
    return {
      color: "orange",
      label: "Unavailable soon",
      reason: `Overnight restriction at 3:00 AM (${minsUntilOvernight} min)`,
    };
  }

  return {
    color: "green",
    label: "Available",
    reason: "Open hours — all lots available",
  };
}
