"use client";

import { ParkingLot, LotStatus, StatusColor } from "@/types";

const colorMap: Record<string, string> = {
  green: "#16a34a",
  yellow: "#ca8a04",
  orange: "#ea580c",
  red: "#dc2626",
};

const statusFilterOptions: { color: StatusColor; label: string }[] = [
  { color: "yellow", label: "Opening soon" },
  { color: "orange", label: "Closing soon" },
];

const categoryFilterOptions: { value: string; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "employee", label: "Employee" },
  { value: "overnightExempt", label: "Overnight OK" },
];

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

interface Props {
  lots: ParkingLot[];
  statuses: Map<string, LotStatus>;
  selectedLotId: string | null;
  dark: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilters: Set<StatusColor>;
  onToggleStatus: (color: StatusColor) => void;
  categoryFilters: Set<string>;
  onToggleCategory: (value: string) => void;
  onLotClick?: (lot: ParkingLot) => void;
  onToggleDark: () => void;
  nearMeActive: boolean;
  locatingUser: boolean;
  onNearMe: () => void;
  lotDistances: Map<string, number>;
  skipSort?: boolean;
  onShowShuttles: () => void;
}

export default function LotListPanel({
  lots,
  statuses,
  selectedLotId,
  dark,
  search,
  onSearchChange,
  statusFilters,
  onToggleStatus,
  categoryFilters,
  onToggleCategory,
  onLotClick,
  onToggleDark,
  nearMeActive,
  locatingUser,
  onNearMe,
  lotDistances,
  skipSort,
  onShowShuttles,
}: Props) {
  const order: StatusColor[] = ["green", "yellow", "orange", "red"];
  const sorted = skipSort
    ? lots
    : [...lots].sort((a, b) => {
        const sa = statuses.get(a.id)!;
        const sb = statuses.get(b.id)!;
        return order.indexOf(sa.color) - order.indexOf(sb.color);
      });

  const d = dark;
  const bg = d ? "#2a2a3d" : "#ffffff";
  const bgAlt = d ? "#353550" : "#f5f5f5";
  const text = d ? "#eaeaea" : "#1a1a1a";
  const textMuted = d ? "#9999bb" : "#666";
  const border = d ? "#3d3d55" : "#e5e5e5";
  const hoverBg = d ? "#353550" : "#f5f5f5";
  const selectedBg = d ? "#3d3d6a" : "#e8f0fe";

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
        {/* Title row with dark mode toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: text }}>
            Colgate Parking
          </span>
          <button
            onClick={onToggleDark}
            style={{
              background: d ? "#353550" : "#f0f0f0",
              border: `1px solid ${border}`,
              borderRadius: 20,
              padding: "5px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              color: text,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>{d ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
            {d ? "Light" : "Dark"}
          </button>
        </div>

        {/* Action buttons row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {/* Near Me button */}
          <button
            onClick={onNearMe}
            disabled={locatingUser}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: "none",
              background: nearMeActive ? "#3b82f6" : (d ? "#353550" : "#f0f0f0"),
              color: nearMeActive ? "#fff" : text,
              fontSize: 12,
              fontWeight: 600,
              cursor: locatingUser ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 14 }}>{"\uD83D\uDCCD"}</span>
            {locatingUser ? "Locating..." : nearMeActive ? "Near me" : "Near me"}
          </button>

          {/* Shuttle button */}
          <button
            onClick={onShowShuttles}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: "none",
              background: d ? "#353550" : "#f0f0f0",
              color: text,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 14 }}>{"\uD83D\uDE8C"}</span>
            Shuttles
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search lots..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%",
            padding: "7px 10px",
            fontSize: 12,
            border: `1px solid ${border}`,
            borderRadius: 6,
            background: bgAlt,
            color: text,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Filters */}
        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
          {statusFilterOptions.map((f) => {
            const active = statusFilters.has(f.color);
            return (
              <button
                key={f.color}
                onClick={() => onToggleStatus(f.color)}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: active ? "none" : `1px solid ${border}`,
                  background: active ? colorMap[f.color] : "transparent",
                  color: active ? "#fff" : textMuted,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          {categoryFilterOptions.map((f) => {
            const active = categoryFilters.has(f.value);
            return (
              <button
                key={f.value}
                onClick={() => onToggleCategory(f.value)}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: active ? "none" : `1px solid ${border}`,
                  background: active ? "#3b82f6" : "transparent",
                  color: active ? "#fff" : textMuted,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Count */}
        <div style={{ fontSize: 11, color: textMuted, marginTop: 8 }}>
          {sorted.length} lot{sorted.length !== 1 ? "s" : ""}
          {nearMeActive ? " available nearby" : ""}
        </div>
      </div>

      {/* Lot list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {sorted.map((lot) => {
          const status = statuses.get(lot.id)!;
          const isSelected = lot.id === selectedLotId;
          const dist = lotDistances.get(lot.id);
          return (
            <div
              key={lot.id}
              onClick={() => onLotClick?.(lot)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "8px 8px",
                borderRadius: 6,
                cursor: "pointer",
                background: isSelected ? selectedBg : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: colorMap[status.color],
                  marginTop: 3,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {lot.name}
                  </div>
                  {nearMeActive && dist != null && (
                    <span style={{ fontSize: 10, color: textMuted, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {formatDist(dist)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: textMuted, marginTop: 1 }}>
                  {status.reason}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
