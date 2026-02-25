"use client";

import { Polygon, Popup } from "react-leaflet";
import { ParkingLot, LotStatus } from "@/types";

// Brighter colors for dark map, standard for light
const lightColors: Record<string, string> = {
  green: "#16a34a",
  yellow: "#ca8a04",
  orange: "#ea580c",
  red: "#dc2626",
};

const darkColors: Record<string, string> = {
  green: "#4ade80",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#f87171",
};

interface Props {
  lot: ParkingLot;
  status: LotStatus;
  selected?: boolean;
  dark?: boolean;
}

export default function LotMarker({ lot, status, selected, dark }: Props) {
  const colors = dark ? darkColors : lightColors;
  const c = colors[status.color];

  return (
    <Polygon
      positions={lot.polygon}
      pathOptions={{
        fillColor: c,
        fillOpacity: selected ? 0.85 : 0.55,
        color: selected ? "#fff" : c,
        weight: selected ? 3 : 1.5,
        opacity: selected ? 1 : 0.8,
      }}
    >
      <Popup>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{lot.name}</div>
          <div
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              background: lightColors[status.color],
            }}
          >
            {status.label}
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{status.reason}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 2, textTransform: "capitalize" }}>
            {lot.category} lot{lot.overnightExempt ? " \u00b7 Overnight exempt" : ""}
          </div>
        </div>
      </Popup>
    </Polygon>
  );
}
