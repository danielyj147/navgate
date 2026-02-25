"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  shuttleSchedules,
  RouteSchedule,
  SubSchedule,
  getNextDeparture,
  isScheduleActive,
  toMinutes,
} from "@/data/shuttle-schedules";
import { EasternTime, getEasternTime } from "@/lib/time-utils";
import { ShuttleVehicle } from "@/types";
import { fetchVehicles } from "@/lib/shuttle-api";

interface ShuttlePanelProps {
  dark: boolean;
  enabledRoutes: Set<number>;
  onToggleRoute: (routeID: number) => void;
  onBack: () => void;
}

export default function ShuttlePanel({
  dark,
  enabledRoutes,
  onToggleRoute,
  onBack,
}: ShuttlePanelProps) {
  const [now, setNow] = useState(() => new Date());
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [activeVehicles, setActiveVehicles] = useState<ShuttleVehicle[]>([]);

  // Tick every 15s to keep "next departure" fresh
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Fetch vehicles for active count
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const v = await fetchVehicles();
        if (!cancelled) setActiveVehicles(v.filter((x) => x.routeID !== -1));
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const eastern = useMemo(() => getEasternTime(now), [now]);

  // ── Colors ────────────────────────────────────────────
  const d = dark;
  const bg = d ? "#2a2a3d" : "#ffffff";
  const bgCard = d ? "#313148" : "#f8f8fb";
  const bgCardHover = d ? "#3a3a58" : "#f0f0f5";
  const text = d ? "#eaeaea" : "#1a1a1a";
  const textMuted = d ? "#9999bb" : "#666";
  const textFaint = d ? "#6e6e8a" : "#aaa";
  const border = d ? "#3d3d55" : "#e5e5e5";
  const bgActive = d ? "#2a4a2a" : "#e8f5e9";
  const bgInactive = d ? "#3d2a2a" : "#fef3f0";

  const toggleRoute = useCallback(
    (routeName: string) => {
      setExpandedRoute((prev) => (prev === routeName ? null : routeName));
      setExpandedSub(null);
    },
    []
  );

  const toggleSub = useCallback((key: string) => {
    setExpandedSub((prev) => (prev === key ? null : key));
  }, []);

  return (
    <div
      style={{
        background: bg,
        borderRight: `1px solid ${border}`,
        width: 320,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: textMuted,
              cursor: "pointer",
              fontSize: 18,
              padding: "0 4px",
              lineHeight: 1,
            }}
            aria-label="Back to parking"
          >
            &larr;
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: text }}>
            Colgate Shuttles
          </span>
        </div>
        <div style={{ fontSize: 11, color: textMuted, marginLeft: 28 }}>
          {activeVehicles.length} vehicle{activeVehicles.length !== 1 ? "s" : ""} active
        </div>
      </div>

      {/* Route list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {shuttleSchedules.map((route) => (
          <RouteCard
            key={route.routeName}
            route={route}
            eastern={eastern}
            expanded={expandedRoute === route.routeName}
            expandedSub={expandedSub}
            onToggle={() => toggleRoute(route.routeName)}
            onToggleSub={toggleSub}
            dark={d}
            colors={{ bgCard, bgCardHover, text, textMuted, textFaint, border, bgActive, bgInactive }}
          />
        ))}
      </div>

      {/* Footer link */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${border}`,
          fontSize: 11,
          color: textMuted,
          textAlign: "center",
        }}
      >
        Schedules from{" "}
        <a
          href="https://www.colgate.edu/about/our-location/maps-travel/colgate-shuttle-service"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: d ? "#8ba4d9" : "#3b6ec9", textDecoration: "none" }}
        >
          Colgate Transportation
        </a>
      </div>
    </div>
  );
}

// ─── RouteCard ──────────────────────────────────────────────────────

interface RouteCardProps {
  route: RouteSchedule;
  eastern: EasternTime;
  expanded: boolean;
  expandedSub: string | null;
  onToggle: () => void;
  onToggleSub: (key: string) => void;
  dark: boolean;
  colors: {
    bgCard: string;
    bgCardHover: string;
    text: string;
    textMuted: string;
    textFaint: string;
    border: string;
    bgActive: string;
    bgInactive: string;
  };
}

function RouteCard({
  route,
  eastern,
  expanded,
  expandedSub,
  onToggle,
  onToggleSub,
  dark,
  colors,
}: RouteCardProps) {
  const { bgCard, text, textMuted, textFaint, border, bgActive, bgInactive } = colors;

  // Is any sub-schedule currently active?
  const anyActive = route.schedules.some((s) => isScheduleActive(s, eastern));

  // Find the soonest next departure across all active sub-schedules
  let nextDep: string | null = null;
  let nextSubLabel: string | null = null;
  for (const sub of route.schedules) {
    if (!sub.daysOfWeek.includes(eastern.dayOfWeek)) continue;
    const dep = getNextDeparture(sub, eastern);
    if (dep) {
      if (!nextDep || toMinutes(dep) < toMinutes(nextDep)) {
        nextDep = dep;
        nextSubLabel = sub.label;
      }
    }
  }

  // Minutes until next departure
  const minsUntil = nextDep
    ? toMinutes(nextDep) - (eastern.minutesSinceMidnight)
    : null;

  const routeColor = `#${route.color}`;

  return (
    <div
      style={{
        marginBottom: 8,
        borderRadius: 8,
        border: `1px solid ${border}`,
        overflow: "hidden",
        background: bgCard,
      }}
    >
      {/* Card header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
        }}
      >
        {/* Route color dot */}
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: routeColor,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: text }}>
            {route.routeName}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 1 }}>
            {anyActive ? (
              nextDep && minsUntil != null ? (
                <>
                  Next: <strong style={{ color: routeColor }}>{nextDep}</strong>
                  <span style={{ color: textFaint }}> ({minsUntil} min)</span>
                </>
              ) : (
                "Running — no more departures today"
              )
            ) : (
              "Not running now"
            )}
          </div>
        </div>
        {/* Status badge */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 10,
            background: anyActive ? bgActive : bgInactive,
            color: anyActive ? (dark ? "#6bda6b" : "#2e7d32") : (dark ? "#da6b6b" : "#c62828"),
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {anyActive ? "Active" : "Inactive"}
        </span>
        {/* Chevron */}
        <span
          style={{
            fontSize: 12,
            color: textFaint,
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        >
          &#9656;
        </span>
      </button>

      {/* Expanded sub-schedules */}
      {expanded && (
        <div style={{ padding: "0 12px 10px" }}>
          {route.schedules.map((sub) => {
            const subKey = `${route.routeName}-${sub.label}`;
            const subExpanded = expandedSub === subKey;
            const active = isScheduleActive(sub, eastern);
            const subNext = sub.daysOfWeek.includes(eastern.dayOfWeek)
              ? getNextDeparture(sub, eastern)
              : null;

            return (
              <div key={subKey} style={{ marginTop: 6 }}>
                {/* Sub-schedule header */}
                <button
                  onClick={() => onToggleSub(subKey)}
                  style={{
                    width: "100%",
                    padding: "7px 8px",
                    background: dark ? "#282840" : "#f0f0f5",
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: text }}>
                      {sub.label}
                    </span>
                    <span style={{ fontSize: 11, color: textMuted, marginLeft: 6 }}>
                      {sub.days}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {active && subNext && (
                      <span style={{ fontSize: 10, color: routeColor, fontWeight: 600 }}>
                        Next {subNext}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        color: textFaint,
                        transform: subExpanded ? "rotate(90deg)" : "rotate(0)",
                        transition: "transform 0.15s",
                      }}
                    >
                      &#9656;
                    </span>
                  </div>
                </button>

                {/* Timetable */}
                {subExpanded && (
                  <SubScheduleTable
                    sub={sub}
                    eastern={eastern}
                    routeColor={routeColor}
                    dark={dark}
                    colors={colors}
                  />
                )}
              </div>
            );
          })}

          {/* Link to source */}
          <div style={{ marginTop: 8, textAlign: "right" }}>
            <a
              href={route.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10,
                color: dark ? "#7a8abf" : "#5a7ac2",
                textDecoration: "none",
              }}
            >
              Full schedule &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SubScheduleTable ──────────────────────────────────────────────

interface SubScheduleTableProps {
  sub: SubSchedule;
  eastern: EasternTime;
  routeColor: string;
  dark: boolean;
  colors: {
    bgCard: string;
    bgCardHover: string;
    text: string;
    textMuted: string;
    textFaint: string;
    border: string;
    bgActive: string;
    bgInactive: string;
  };
}

function SubScheduleTable({ sub, eastern, routeColor, dark, colors }: SubScheduleTableProps) {
  const { text, textMuted, textFaint, border } = colors;
  const currentMins = eastern.minutesSinceMidnight;
  const isToday = sub.daysOfWeek.includes(eastern.dayOfWeek);

  return (
    <div
      style={{
        marginTop: 4,
        maxHeight: 260,
        overflowY: "auto",
        borderRadius: 6,
        border: `1px solid ${border}`,
      }}
    >
      {/* Stops header */}
      <div
        style={{
          padding: "6px 8px",
          background: dark ? "#252540" : "#f5f5fa",
          borderBottom: `1px solid ${border}`,
          fontSize: 10,
          color: textMuted,
          fontWeight: 600,
        }}
      >
        Stops: {sub.stops.map((s) => s.name).join(" \u2192 ")}
      </div>

      {/* Departure list */}
      <div style={{ padding: "4px 0" }}>
        {sub.departures.map((dep, i) => {
          const depMins = toMinutes(dep);
          const lastStopOffset = sub.stops[sub.stops.length - 1]?.offset ?? 0;
          const isPast = isToday && depMins + lastStopOffset < currentMins;
          const isNext = isToday && !isPast && depMins > currentMins;
          // Find the first "next" departure
          const isFirstNext =
            isNext &&
            (i === 0 || toMinutes(sub.departures[i - 1]) <= currentMins);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 10px",
                fontSize: 12,
                color: isPast ? textFaint : text,
                background: isFirstNext
                  ? dark
                    ? "rgba(100,180,255,0.1)"
                    : "rgba(59,130,246,0.08)"
                  : "transparent",
                borderLeft: isFirstNext ? `3px solid ${routeColor}` : "3px solid transparent",
                fontWeight: isFirstNext ? 600 : 400,
              }}
            >
              <span style={{ width: 24, color: textFaint, fontSize: 10 }}>
                {i + 1}.
              </span>
              <span>{dep}</span>
              {isFirstNext && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: routeColor,
                    fontWeight: 600,
                  }}
                >
                  next
                </span>
              )}
              {isPast && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: textFaint,
                  }}
                >
                  passed
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
