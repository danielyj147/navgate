const easternFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
  weekday: "long",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export interface EasternTime {
  minutesSinceMidnight: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  formatted: string;
}

export function getEasternTime(now: Date = new Date()): EasternTime {
  const parts = easternFormat.formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  const minutesSinceMidnight = hour * 60 + minute;

  const weekday = get("weekday");
  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const dayOfWeek = dayMap[weekday] ?? 0;

  const h = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  const formatted = `${h}:${minute.toString().padStart(2, "0")} ${ampm}`;

  return { minutesSinceMidnight, dayOfWeek, formatted };
}

export function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}
