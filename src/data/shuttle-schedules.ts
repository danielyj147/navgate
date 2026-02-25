/**
 * Colgate Shuttle Schedules
 * Source: Colgate University Transportation Office (via Infogram embeds)
 *
 * Each route has one or more sub-schedules (e.g. daytime / evening) with
 * different operating days. Departure times are stored for the *first stop*
 * of each trip — subsequent stop times are a few minutes later and can be
 * viewed in the full timetable.
 */

export interface ScheduleStop {
  name: string;
  /** Minutes after first-stop departure (0 for the first stop). */
  offset: number;
}

export interface SubSchedule {
  label: string; // e.g. "Daytime", "Evening"
  days: string; // e.g. "Mon–Fri", "Mon–Sun"
  /** Days as numbers: 0=Sun … 6=Sat */
  daysOfWeek: number[];
  stops: ScheduleStop[];
  /** Departure times from the first stop, in "H:MM a" format. */
  departures: string[];
}

export interface RouteSchedule {
  routeName: string;
  /** Hex color WITHOUT the # prefix, matching the API route color. */
  color: string;
  schedules: SubSchedule[];
  /** URL to Colgate's official schedule page */
  sourceUrl: string;
}

// ─── Bookstore-Apartments ──────────────────────────────────────────

const bookstoreApartments: RouteSchedule = {
  routeName: "Bookstore-Apartments",
  color: "e10028",
  schedules: [
    {
      label: "Daytime",
      days: "Mon–Fri",
      daysOfWeek: [1, 2, 3, 4, 5],
      stops: [
        { name: "Colgate Bookstore", offset: 0 },
        { name: "Lebanon & West Pleasant", offset: 1 },
        { name: "SOMAC", offset: 2 },
        { name: "Newell Apartments", offset: 6 },
        { name: "University Court Apts", offset: 9 },
        { name: "Parker Apartments", offset: 12 },
        { name: "Whitnall Field", offset: 16 },
        { name: "Case Library", offset: 18 },
        { name: "Frank Dining Hall", offset: 23 },
        { name: "Gate House", offset: 28 },
        { name: "Kendrick & Broad", offset: 31 },
      ],
      departures: [
        "7:04 AM", "7:44 AM", "8:04 AM", "8:24 AM", "8:44 AM",
        "9:04 AM", "9:24 AM", "9:44 AM", "10:04 AM", "10:24 AM",
        "10:44 AM", "11:24 AM", "12:04 PM", "12:24 PM",
        "1:04 PM", "1:44 PM", "2:04 PM", "2:24 PM", "2:44 PM",
        "3:04 PM", "3:24 PM", "4:04 PM",
      ],
    },
    {
      label: "Evening",
      days: "Mon–Sun",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      stops: [
        { name: "Colgate Bookstore", offset: 0 },
        { name: "Lebanon & West Pleasant", offset: 1 },
        { name: "SOMAC", offset: 2 },
        { name: "Newell Apartments", offset: 6 },
        { name: "University Court Apts", offset: 9 },
        { name: "Parker Apartments", offset: 12 },
        { name: "Whitnall Field", offset: 16 },
        { name: "Case Library", offset: 18 },
        { name: "Frank Dining Hall", offset: 23 },
        { name: "Gate House", offset: 28 },
        { name: "Class of 1965 Arena", offset: 33 },
        { name: "Kendrick & Broad", offset: 36 },
      ],
      departures: [
        "4:37 PM", "5:17 PM", "5:57 PM", "6:37 PM", "7:17 PM",
        "7:57 PM", "8:37 PM", "9:17 PM", "9:57 PM",
        "11:17 PM", "11:57 PM", "12:37 AM", "1:17 AM", "1:57 AM", "2:37 AM",
      ],
    },
  ],
  sourceUrl:
    "https://www.colgate.edu/about/our-location/maps-travel/colgate-shuttle-service/bookstore-apartments-shuttle-schedule",
};

// ─── Townhouse ─────────────────────────────────────────────────────

const townhouse: RouteSchedule = {
  routeName: "Townhouse",
  color: "f0aa00",
  schedules: [
    {
      label: "Daytime",
      days: "Mon–Fri",
      daysOfWeek: [1, 2, 3, 4, 5],
      stops: [
        { name: "Townhouse Apartments", offset: 0 },
        { name: "113 Broad Street", offset: 5 },
        { name: "Bernstein Hall", offset: 7 },
        { name: "Case Library", offset: 10 },
        { name: "Frank Dining Hall", offset: 16 },
        { name: "Gate House", offset: 21 },
        { name: "Class of 1965 Arena", offset: 29 },
        { name: "Student Health Center", offset: 32 },
      ],
      departures: [
        "7:02 AM", "7:38 AM", "7:57 AM", "8:14 AM", "8:33 AM",
        "8:50 AM", "9:09 AM", "9:26 AM", "9:45 AM", "10:02 AM",
        "10:21 AM", "10:38 AM", "10:57 AM", "11:33 AM",
        "12:26 PM", "1:02 PM", "1:21 PM", "1:38 PM", "1:57 PM",
        "2:14 PM", "2:33 PM", "2:50 PM", "3:09 PM", "3:45 PM",
      ],
    },
    {
      label: "Evening",
      days: "Mon–Sun",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      stops: [
        { name: "Townhouse Apartments", offset: 0 },
        { name: "113 Broad Street", offset: 5 },
        { name: "Bernstein Hall", offset: 7 },
        { name: "Case Library", offset: 10 },
        { name: "Frank Dining Hall", offset: 15 },
        { name: "Gate House", offset: 20 },
        { name: "Kendrick & Broad", offset: 23 },
        { name: "Colgate Bookstore", offset: 27 },
        { name: "Class of 1965 Arena", offset: 34 },
        { name: "Student Health Center", offset: 38 },
      ],
      departures: [
        "4:17 PM", "4:57 PM", "5:37 PM", "6:17 PM", "6:57 PM",
        "7:37 PM", "8:17 PM", "8:57 PM",
        "10:17 PM", "10:57 PM", "11:37 PM",
        "12:17 AM", "12:57 AM", "1:37 AM", "2:17 AM",
      ],
    },
  ],
  sourceUrl:
    "https://www.colgate.edu/about/our-location/maps-travel/colgate-shuttle-service/townhouse-shuttle-schedule",
};

// ─── Local Shopping ────────────────────────────────────────────────

const shopping: RouteSchedule = {
  routeName: "Shopping",
  color: "2563eb",
  schedules: [
    {
      label: "Regular",
      days: "Mon–Sun",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      stops: [
        { name: "Newell Apartments", offset: 0 },
        { name: "University Court Apts", offset: 4 },
        { name: "Parker Apartments", offset: 7 },
        { name: "Townhouse Apartments", offset: 12 },
        { name: "113 Broad Street", offset: 17 },
        { name: "Frank Dining Hall", offset: 23 },
        { name: "Gate House", offset: 28 },
        { name: "Kendrick & Broad", offset: 31 },
        { name: "Village Green", offset: 34 },
        { name: "Parry's", offset: 38 },
        { name: "Price Chopper", offset: 43 },
        { name: "Colgate Bookstore", offset: 50 },
      ],
      departures: [
        "10:02 AM", "10:58 AM", "11:54 AM", "12:50 PM", "1:46 PM",
        "3:38 PM", "4:34 PM", "5:30 PM", "6:26 PM", "7:22 PM",
      ],
    },
    {
      label: "Break",
      days: "Tue & Thu",
      daysOfWeek: [2, 4],
      stops: [
        { name: "Newell Apartments", offset: 0 },
        { name: "University Court Apts", offset: 4 },
        { name: "Parker Apartments", offset: 7 },
        { name: "Townhouse Apartments", offset: 12 },
        { name: "113 Broad Street", offset: 17 },
        { name: "Frank Dining Hall", offset: 23 },
        { name: "Gate House", offset: 28 },
        { name: "Kendrick & Broad", offset: 31 },
        { name: "Village Green", offset: 34 },
        { name: "Parry's", offset: 38 },
        { name: "Price Chopper", offset: 43 },
        { name: "Colgate Bookstore", offset: 50 },
      ],
      departures: [
        "11:54 AM", "12:50 PM", "1:46 PM", "2:42 PM",
        "4:34 PM", "5:30 PM", "6:26 PM", "7:22 PM",
      ],
    },
  ],
  sourceUrl:
    "https://www.colgate.edu/about/our-location/maps-travel/colgate-shuttle-service/local-shopping-shuttle-schedule",
};

// ─── Wellness ──────────────────────────────────────────────────────

const wellness: RouteSchedule = {
  routeName: "Wellness",
  color: "6b3fa0",
  schedules: [
    {
      label: "Pick-up",
      days: "Mon–Fri",
      daysOfWeek: [1, 2, 3, 4, 5],
      stops: [
        { name: "James B. Colgate Hall", offset: 0 },
        { name: "Frank Dining Hall", offset: 4 },
        { name: "Academic Drive", offset: 9 },
        { name: "Huntington Gymnasium", offset: 13 },
      ],
      departures: ["11:52 AM"],
    },
    {
      label: "Return",
      days: "Mon–Fri",
      daysOfWeek: [1, 2, 3, 4, 5],
      stops: [
        { name: "Huntington Gymnasium", offset: 0 },
        { name: "James B. Colgate Hall", offset: 4 },
        { name: "Frank Dining Hall", offset: 7 },
        { name: "Academic Drive", offset: 10 },
      ],
      departures: ["1:02 PM"],
    },
  ],
  sourceUrl:
    "https://www.colgate.edu/about/our-location/maps-travel/colgate-shuttle-service/wellness-shuttle-schedule",
};

// ─── Exports ───────────────────────────────────────────────────────

export const shuttleSchedules: RouteSchedule[] = [
  bookstoreApartments,
  townhouse,
  shopping,
  wellness,
];

// ─── Helpers ───────────────────────────────────────────────────────

/** Parse "H:MM AM" / "H:MM PM" into { hour24, minute }. */
export function parseTime(t: string): { hour: number; minute: number } {
  const [time, meridiem] = t.split(" ");
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const isPM = meridiem.toUpperCase() === "PM";
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return { hour: h, minute: m };
}

/** Convert a departure string to total minutes since midnight. */
export function toMinutes(t: string): number {
  const { hour, minute } = parseTime(t);
  return hour * 60 + minute;
}

/** Minimal time info needed by schedule helpers (matches EasternTime shape). */
interface TimeInfo {
  minutesSinceMidnight: number;
  dayOfWeek: number;
}

/**
 * Get the next departure for a sub-schedule given the current Eastern time.
 * Returns the departure string or null if no more departures today.
 */
export function getNextDeparture(
  schedule: SubSchedule,
  now: TimeInfo
): string | null {
  const currentMinutes = now.minutesSinceMidnight;
  for (const dep of schedule.departures) {
    if (toMinutes(dep) > currentMinutes) return dep;
  }
  return null;
}

/**
 * Check whether a sub-schedule is currently operating at the given time.
 * "Operating" means the current day matches AND we're within the first–last
 * departure window (± a buffer for the last stop).
 */
export function isScheduleActive(
  schedule: SubSchedule,
  now: TimeInfo
): boolean {
  const dow = now.dayOfWeek;
  if (!schedule.daysOfWeek.includes(dow)) return false;
  if (schedule.departures.length === 0) return false;
  const first = toMinutes(schedule.departures[0]);
  const last = toMinutes(schedule.departures[schedule.departures.length - 1]);
  const lastStopOffset = schedule.stops[schedule.stops.length - 1]?.offset ?? 0;
  const currentMinutes = now.minutesSinceMidnight;

  // Handle overnight schedules (last departure is after midnight → smaller than first)
  if (last < first) {
    return currentMinutes >= first || currentMinutes <= last + lastStopOffset;
  }
  return currentMinutes >= first - 5 && currentMinutes <= last + lastStopOffset;
}
