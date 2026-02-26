"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  shuttleSchedules,
  RouteSchedule,
  SubSchedule,
  getNextDeparture,
  isScheduleActive,
  toMinutes,
} from "@/data/shuttle-schedules";
import { EasternTime, getEasternTime } from "@/lib/time-utils";
import { ShuttleRoute, ShuttleVehicle } from "@/types";
import { fetchVehicles } from "@/lib/shuttle-api";

interface ShuttlePanelProps {
  dark: boolean;
  apiRoutes: ShuttleRoute[];
  visibleRouteIDs: Set<number>;
  onToggleRouteVisibility: (routeID: number) => void;
  showVehicles: boolean;
  onToggleVehicles: () => void;
  showStops: boolean;
  onToggleStops: () => void;
  onBack: () => void;
}

/** Map schedule route names to their primary API route IDs. */
const SCHEDULE_TO_API: Record<string, number> = {
  "Bookstore-Apartments": 12624,
  Townhouse: 12626,
  Shopping: 12625,
  Wellness: 12627,
};

/** Client-side route color overrides (without leading #). */
const ROUTE_COLOR_OVERRIDES: Record<number, string> = {
  12624: "e10028", // Bookstore-Apartments → red
  12625: "2563eb", // Shopping → blue
};

/** Get display color for an API route, applying overrides. */
function getRouteColor(route: ShuttleRoute): string {
  return ROUTE_COLOR_OVERRIDES[route.routeID] ?? route.color;
}

export default function ShuttlePanel({
  dark,
  apiRoutes,
  visibleRouteIDs,
  onToggleRouteVisibility,
  showVehicles,
  onToggleVehicles,
  showStops,
  onToggleStops,
  onBack,
}: ShuttlePanelProps) {
  const [now, setNow] = useState(() => new Date());
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [activeVehicles, setActiveVehicles] = useState<ShuttleVehicle[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [showInactiveRoutes, setShowInactiveRoutes] = useState(false);
  const prevLiveRef = useRef<Set<number>>(new Set());
  const baselineSetRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const v = await fetchVehicles();
        if (!cancelled) setActiveVehicles(v.filter((x) => x.routeID !== -1));
      } catch { /* silent */ }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Auto-check routes that gain vehicles, auto-uncheck routes that lose vehicles.
  // Wait for the first real vehicle data to establish a baseline before auto-toggling.
  useEffect(() => {
    if (activeVehicles.length === 0) return;

    const currentLive = new Set(activeVehicles.map((v) => v.routeID));

    if (!baselineSetRef.current) {
      // First real data — record baseline, don't toggle anything
      prevLiveRef.current = currentLive;
      baselineSetRef.current = true;
      return;
    }

    const prev = prevLiveRef.current;

    // Find newly active and newly inactive routes
    const newlyActive = [...currentLive].filter((id) => !prev.has(id));
    const newlyInactive = [...prev].filter((id) => !currentLive.has(id));

    if (newlyActive.length > 0 || newlyInactive.length > 0) {
      for (const id of newlyActive) {
        if (!visibleRouteIDs.has(id)) onToggleRouteVisibility(id);
      }
      for (const id of newlyInactive) {
        if (visibleRouteIDs.has(id)) onToggleRouteVisibility(id);
      }
    }

    prevLiveRef.current = currentLive;
  }, [activeVehicles]); // intentionally omit visibleRouteIDs/onToggleRouteVisibility to avoid loops

  const eastern = useMemo(() => getEasternTime(now), [now]);

  // Set of API route IDs that currently have at least one vehicle
  const liveRouteIDs = useMemo(
    () => new Set(activeVehicles.map((v) => v.routeID)),
    [activeVehicles]
  );

  // Count vehicles per route
  const vehicleCountByRoute = useMemo(() => {
    const m = new Map<number, number>();
    for (const v of activeVehicles) {
      m.set(v.routeID, (m.get(v.routeID) ?? 0) + 1);
    }
    return m;
  }, [activeVehicles]);

  // Split schedules into active (have vehicles) and inactive
  const { activeSchedules, inactiveSchedules } = useMemo(() => {
    const active: RouteSchedule[] = [];
    const inactive: RouteSchedule[] = [];
    for (const sched of shuttleSchedules) {
      const apiID = SCHEDULE_TO_API[sched.routeName];
      if (apiID && liveRouteIDs.has(apiID)) {
        active.push(sched);
      } else {
        inactive.push(sched);
      }
    }
    return { activeSchedules: active, inactiveSchedules: inactive };
  }, [liveRouteIDs]);

  const d = dark;
  const bg = d ? "#2a2a3d" : "#ffffff";
  const bgCard = d ? "#313148" : "#f8f8fb";
  const text = d ? "#eaeaea" : "#1a1a1a";
  const textMuted = d ? "#9999bb" : "#666";
  const textFaint = d ? "#6e6e8a" : "#aaa";
  const border = d ? "#3d3d55" : "#e5e5e5";
  const bgActive = d ? "#2a4a2a" : "#e8f5e9";
  const bgInactive = d ? "#3d2a2a" : "#fef3f0";
  const bgControl = d ? "#282840" : "#f0f0f5";

  const toggleExpand = useCallback((routeName: string) => {
    setExpandedRoute((prev) => (prev === routeName ? null : routeName));
    setExpandedSub(null);
  }, []);

  const toggleSub = useCallback((key: string) => {
    setExpandedSub((prev) => (prev === key ? null : key));
  }, []);

  const colors = { bgCard, text, textMuted, textFaint, border, bgActive, bgInactive };

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
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
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

        {/* Map layer controls */}
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            background: bgControl,
            borderRadius: 6,
            border: `1px solid ${border}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, marginBottom: 6 }}>
            Show on map
          </div>

          {/* Active routes — shown directly */}
          {apiRoutes
            .filter((r) => liveRouteIDs.has(r.routeID))
            .map((r) => (
              <RouteCheckbox
                key={r.routeID}
                route={r}
                checked={visibleRouteIDs.has(r.routeID)}
                count={vehicleCountByRoute.get(r.routeID) ?? 0}
                onToggle={() => onToggleRouteVisibility(r.routeID)}
                text={text}
                textFaint={textFaint}
                dark={d}
              />
            ))}

          {/* Inactive routes — collapsible */}
          {apiRoutes.filter((r) => !liveRouteIDs.has(r.routeID)).length > 0 && (
            <>
              <button
                onClick={() => setShowInactiveRoutes((v) => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 0",
                  fontSize: 10,
                  color: textFaint,
                  width: "100%",
                }}
              >
                <span
                  style={{
                    transform: showInactiveRoutes ? "rotate(90deg)" : "rotate(0)",
                    transition: "transform 0.15s",
                  }}
                >
                  &#9656;
                </span>
                Inactive routes ({apiRoutes.filter((r) => !liveRouteIDs.has(r.routeID)).length})
              </button>
              {showInactiveRoutes &&
                apiRoutes
                  .filter((r) => !liveRouteIDs.has(r.routeID))
                  .map((r) => (
                    <RouteCheckbox
                      key={r.routeID}
                      route={r}
                      checked={visibleRouteIDs.has(r.routeID)}
                      count={0}
                      onToggle={() => onToggleRouteVisibility(r.routeID)}
                      text={text}
                      textFaint={textFaint}
                      dark={d}
                    />
                  ))}
            </>
          )}

          <div style={{ borderTop: `1px solid ${border}`, margin: "6px 0" }} />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "3px 0",
              cursor: "pointer",
              fontSize: 12,
              color: showVehicles ? text : textFaint,
            }}
          >
            <input
              type="checkbox"
              checked={showVehicles}
              onChange={onToggleVehicles}
              style={{ accentColor: "#3b82f6", width: 14, height: 14, cursor: "pointer" }}
            />
            <span>Vehicles</span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "3px 0",
              cursor: "pointer",
              fontSize: 12,
              color: showStops ? text : textFaint,
            }}
          >
            <input
              type="checkbox"
              checked={showStops}
              onChange={onToggleStops}
              style={{ accentColor: "#3b82f6", width: 14, height: 14, cursor: "pointer" }}
            />
            <span>Stops</span>
          </label>
        </div>
      </div>

      {/* Schedule cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {/* Active routes — shown directly */}
        {activeSchedules.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, padding: "4px 4px 6px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: d ? "#6bda6b" : "#2e7d32" }} />
              Running now
            </div>
            {activeSchedules.map((route) => {
              const apiID = SCHEDULE_TO_API[route.routeName];
              const count = apiID ? vehicleCountByRoute.get(apiID) ?? 0 : 0;
              return (
                <RouteCard
                  key={route.routeName}
                  route={route}
                  eastern={eastern}
                  expanded={expandedRoute === route.routeName}
                  expandedSub={expandedSub}
                  onToggle={() => toggleExpand(route.routeName)}
                  onToggleSub={toggleSub}
                  dark={d}
                  colors={colors}
                  vehicleCount={count}
                />
              );
            })}
          </>
        )}

        {activeSchedules.length === 0 && (
          <div style={{ padding: "12px 4px", fontSize: 12, color: textMuted, textAlign: "center" }}>
            No shuttles are currently running
          </div>
        )}

        {/* Inactive routes — collapsed accordion */}
        {inactiveSchedules.length > 0 && (
          <div style={{ marginTop: activeSchedules.length > 0 ? 8 : 0 }}>
            <button
              onClick={() => setShowInactive((v) => !v)}
              style={{
                width: "100%",
                padding: "8px 4px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: textFaint,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  transform: showInactive ? "rotate(90deg)" : "rotate(0)",
                  transition: "transform 0.15s",
                }}
              >
                &#9656;
              </span>
              Other schedules ({inactiveSchedules.length})
            </button>

            {showInactive &&
              inactiveSchedules.map((route) => (
                <RouteCard
                  key={route.routeName}
                  route={route}
                  eastern={eastern}
                  expanded={expandedRoute === route.routeName}
                  expandedSub={expandedSub}
                  onToggle={() => toggleExpand(route.routeName)}
                  onToggleSub={toggleSub}
                  dark={d}
                  colors={colors}
                  vehicleCount={0}
                />
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
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

interface Colors {
  bgCard: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  bgActive: string;
  bgInactive: string;
}

interface RouteCardProps {
  route: RouteSchedule;
  eastern: EasternTime;
  expanded: boolean;
  expandedSub: string | null;
  onToggle: () => void;
  onToggleSub: (key: string) => void;
  dark: boolean;
  colors: Colors;
  vehicleCount: number;
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
  vehicleCount,
}: RouteCardProps) {
  const { bgCard, text, textMuted, textFaint, border, bgActive, bgInactive } = colors;
  const hasVehicles = vehicleCount > 0;

  let nextDep: string | null = null;
  for (const sub of route.schedules) {
    if (!sub.daysOfWeek.includes(eastern.dayOfWeek)) continue;
    const dep = getNextDeparture(sub, eastern);
    if (dep && (!nextDep || toMinutes(dep) < toMinutes(nextDep))) {
      nextDep = dep;
    }
  }

  const minsUntil = nextDep ? toMinutes(nextDep) - eastern.minutesSinceMidnight : null;
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
          <div style={{ fontSize: 13, fontWeight: 600, color: text, display: "flex", alignItems: "center", gap: 6 }}>
            {route.routeName}
            {hasVehicles && (
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 8,
                background: bgActive,
                color: dark ? "#6bda6b" : "#2e7d32",
              }}>
                {vehicleCount} bus{vehicleCount !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 1 }}>
            {hasVehicles ? (
              nextDep && minsUntil != null ? (
                <>
                  Next: <strong style={{ color: routeColor }}>{nextDep}</strong>
                  <span style={{ color: textFaint }}> ({minsUntil} min)</span>
                </>
              ) : (
                "Running"
              )
            ) : (
              "Not running now"
            )}
          </div>
        </div>
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

// ─── RouteCheckbox ─────────────────────────────────────────────────

function RouteCheckbox({
  route,
  checked,
  count,
  onToggle,
  text,
  textFaint,
  dark,
}: {
  route: ShuttleRoute;
  checked: boolean;
  count: number;
  onToggle: () => void;
  text: string;
  textFaint: string;
  dark: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "3px 0",
        cursor: "pointer",
        fontSize: 12,
        color: checked ? text : textFaint,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ accentColor: `#${getRouteColor(route)}`, width: 14, height: 14, cursor: "pointer" }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: `#${getRouteColor(route)}`,
          opacity: checked ? 1 : 0.3,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1 }}>{route.longName}</span>
      {count > 0 && (
        <span style={{ fontSize: 10, color: dark ? "#6bda6b" : "#2e7d32", fontWeight: 600 }}>
          {count}
        </span>
      )}
    </label>
  );
}

// ─── SubScheduleTable ──────────────────────────────────────────────

function SubScheduleTable({
  sub,
  eastern,
  routeColor,
  dark,
  colors,
}: {
  sub: SubSchedule;
  eastern: EasternTime;
  routeColor: string;
  dark: boolean;
  colors: Colors;
}) {
  const { text, textFaint, border, textMuted } = colors;
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

      <div style={{ padding: "4px 0" }}>
        {sub.departures.map((dep, i) => {
          const depMins = toMinutes(dep);
          const lastStopOffset = sub.stops[sub.stops.length - 1]?.offset ?? 0;
          const isPast = isToday && depMins + lastStopOffset < currentMins;
          const isNext = isToday && !isPast && depMins > currentMins;
          const isFirstNext =
            isNext && (i === 0 || toMinutes(sub.departures[i - 1]) <= currentMins);

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
                  ? dark ? "rgba(100,180,255,0.1)" : "rgba(59,130,246,0.08)"
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
                <span style={{ marginLeft: "auto", fontSize: 10, color: routeColor, fontWeight: 600 }}>
                  next
                </span>
              )}
              {isPast && (
                <span style={{ marginLeft: "auto", fontSize: 10, color: textFaint }}>
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
