"use client";

const items = [
  { color: "#16a34a", label: "Open to all / Students only" },
  { color: "#ca8a04", label: "Opening soon" },
  { color: "#ea580c", label: "Closing soon" },
  { color: "#dc2626", label: "Employees only / Closed" },
];

interface Props {
  dark: boolean;
}

export default function MapLegend({ dark }: Props) {
  const bg = dark ? "#2a2a3d" : "#ffffff";
  const text = dark ? "#eaeaea" : "#444";
  const border = dark ? "#3d3d55" : "#e5e5e5";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 16,
        zIndex: 1000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: "10px 14px",
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: item.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, color: text }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
