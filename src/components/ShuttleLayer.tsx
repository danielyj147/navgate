"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Polyline, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  ShuttleVehicle,
  ShuttleRoute,
  ShuttleStop,
  ShuttleShape,
} from "@/types";
import {
  fetchVehicles,
  fetchRoutes,
  fetchStops,
  fetchShapes,
  parseShapePoints,
} from "@/lib/shuttle-api";

/** Client-side route color overrides (without leading #). */
const ROUTE_COLOR_OVERRIDES: Record<number, string> = {
  12624: "e10028", // Bookstore-Apartments → red
  12625: "2563eb", // Shopping → blue
};

/** Get the display color for a route, applying overrides. */
function routeColor(route: ShuttleRoute): string {
  return `#${ROUTE_COLOR_OVERRIDES[route.routeID] ?? route.color}`;
}

/**
 * Hardcoded stop→route mapping from official Colgate shuttle schedules.
 * Key = stopID, Value = array of routeIDs that serve that stop.
 *
 * Routes:
 *   12624 = Bookstore-Apartments   12625 = Shopping
 *   12626 = Townhouse              12627 = Wellness
 */
const STOP_ROUTES: Record<number, number[]> = {
  144206: [12624, 12625, 12626],           // Colgate Bookstore
  144207: [12624],                          // Lebanon & West Pleasant
  144208: [12624],                          // SOMAC
  144209: [12624, 12625],                   // Newell Apartments
  144210: [12624, 12625],                   // University Court Apartments
  144211: [12624, 12625],                   // Parker Apartments
  144212: [12624],                          // Whitnall Field
  144213: [12624, 12626],                   // Case Library
  144214: [12624, 12625, 12626, 12627],     // Frank Dining Hall
  144215: [12624, 12625, 12626],            // Gate House
  144216: [12624, 12625, 12626],            // Kendrick and Broad
  144217: [12625],                          // Village Green
  144218: [12625],                          // Parrys and Big Lots
  144219: [12625],                          // Price Chopper
  144220: [12625, 12626],                   // Townhouse Apartments
  144222: [12625, 12626],                   // 113 Broad Street
  144223: [12624, 12626],                   // Class of '65 Arena
  144224: [12626],                          // Health Center
  144225: [12627],                          // James B. Colgate Hall
  144226: [12627],                          // Academic Drive
  144227: [12627],                          // Huntington Gym
  144230: [12626],                          // Bernstein Hall
};

/** Darken a hex color (without leading #) by a factor (0–1). */
function darkenHex(hex: string, amount: number): string {
  const r = Math.round(parseInt(hex.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(hex.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(hex.slice(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

interface ShuttleLayerProps {
  dark: boolean;
  visibleRouteIDs: Set<number>;
  showVehicles: boolean;
  showStops: boolean;
}

/**
 * Creates custom Leaflet panes for proper z-ordering:
 *   shuttleRoutesOutline (z=300) — white/dark outline under colored line
 *   shuttleRoutes        (z=301) — colored route polylines
 *   shuttleStops         (z=450) — stop circle markers
 *   shuttleVehicles      (z=650) — vehicle markers (above markerPane)
 *
 * Returns true once panes are ready so children can reference them safely.
 */
function useShuttlePanes(): boolean {
  const map = useMap();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ensure = (name: string, z: string) => {
      if (!map.getPane(name)) {
        const p = map.createPane(name);
        p.style.zIndex = z;
      }
    };
    ensure("shuttleRoutesOutline", "300");
    ensure("shuttleRoutes", "301");
    ensure("shuttleStops", "450");
    ensure("shuttleVehicles", "650");
    setReady(true);
  }, [map]);

  return ready;
}

/** Build an SVG pie-chart divIcon for multi-route stops. */
function buildPieIcon(colors: string[], dark: boolean): L.DivIcon {
  const size = 14;
  const r = size / 2;
  const strokeColor = dark ? "#555" : "#fff";

  let slices = "";
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    const startAngle = (i / n) * 360 - 90;
    const endAngle = ((i + 1) / n) * 360 - 90;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = r + r * Math.cos(startRad);
    const y1 = r + r * Math.sin(startRad);
    const x2 = r + r * Math.cos(endRad);
    const y2 = r + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    slices += `<path d="M${r},${r} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${colors[i]}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    ${slices}
    <circle cx="${r}" cy="${r}" r="${r - 1}" fill="none" stroke="${strokeColor}" stroke-width="2"/>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [r, r],
  });
}

/** Component that adds directional arrow decorators to route polylines. */
function RouteArrows({
  routes,
  shapeMap,
  dark,
}: {
  routes: ShuttleRoute[];
  shapeMap: Map<number, [number, number][]>;
  dark: boolean;
}) {
  const map = useMap();
  const decoratorsRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    let cancelled = false;

    import("leaflet-polylinedecorator").then(() => {
      if (cancelled) return;

      // Clean up previous decorators
      for (const d of decoratorsRef.current) map.removeLayer(d);
      decoratorsRef.current = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ld = L as any;

      for (const route of routes) {
        const pts = shapeMap.get(route.shapeID);
        if (!pts || pts.length < 2) continue;

        const latLngs = pts.map(([lat, lng]) => L.latLng(lat, lng));
        const decorator = Ld.polylineDecorator(latLngs, {
          patterns: [
            {
              offset: "25%",
              repeat: "150px",
              symbol: Ld.Symbol.arrowHead({
                pixelSize: 10,
                polygon: true,
                pathOptions: dark
                  ? {
                      color: darkenHex((ROUTE_COLOR_OVERRIDES[route.routeID] ?? route.color), 0.35),
                      fillColor: darkenHex((ROUTE_COLOR_OVERRIDES[route.routeID] ?? route.color), 0.35),
                      fillOpacity: 1,
                      weight: 1,
                      opacity: 1,
                    }
                  : {
                      color: "#fff",
                      fillColor: darkenHex((ROUTE_COLOR_OVERRIDES[route.routeID] ?? route.color), 0.4),
                      fillOpacity: 1,
                      weight: 1.5,
                      opacity: 1,
                    },
              }),
            },
          ],
        });

        if (map.getPane("shuttleRoutes")) {
          decorator.options.pane = "shuttleRoutes";
        }

        decorator.addTo(map);
        decoratorsRef.current.push(decorator);
      }
    });

    return () => {
      cancelled = true;
      for (const d of decoratorsRef.current) map.removeLayer(d);
      decoratorsRef.current = [];
    };
  }, [map, routes, shapeMap]);

  return null;
}

export default function ShuttleLayer({
  dark,
  visibleRouteIDs,
  showVehicles,
  showStops,
}: ShuttleLayerProps) {
  const panesReady = useShuttlePanes();
  const [routes, setRoutes] = useState<ShuttleRoute[]>([]);
  const [stops, setStops] = useState<ShuttleStop[]>([]);
  const [shapes, setShapes] = useState<ShuttleShape[]>([]);
  const [vehicles, setVehicles] = useState<ShuttleVehicle[]>([]);
  const mountedRef = useRef(true);

  const loadStatic = useCallback(async () => {
    try {
      const [r, st, sh] = await Promise.all([
        fetchRoutes(),
        fetchStops(),
        fetchShapes(),
      ]);
      if (!mountedRef.current) return;
      setRoutes(r);
      setStops(st);
      setShapes(sh);
    } catch (e) {
      console.error("Failed to load shuttle static data:", e);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      const v = await fetchVehicles();
      if (!mountedRef.current) return;
      setVehicles(v.filter((veh) => veh.routeID !== -1));
    } catch (e) {
      console.error("Failed to load shuttle vehicles:", e);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadStatic();
    loadVehicles();
    const staticInterval = setInterval(loadStatic, 60_000);
    const vehicleInterval = setInterval(loadVehicles, 5_000);
    return () => {
      mountedRef.current = false;
      clearInterval(staticInterval);
      clearInterval(vehicleInterval);
    };
  }, [loadStatic, loadVehicles]);

  const routeMap = useMemo(() => {
    const m = new Map<number, ShuttleRoute>();
    for (const r of routes) m.set(r.routeID, r);
    return m;
  }, [routes]);

  const shapeMap = useMemo(() => {
    const m = new Map<number, [number, number][]>();
    for (const s of shapes) m.set(s.shapeID, parseShapePoints(s.points));
    return m;
  }, [shapes]);

  // Only show routes that have at least one active vehicle AND are checked
  const liveRouteIDs = useMemo(() => {
    const ids = new Set<number>();
    for (const v of vehicles) ids.add(v.routeID);
    return ids;
  }, [vehicles]);

  const filteredRoutes = useMemo(
    () => routes.filter((r) => visibleRouteIDs.has(r.routeID) && liveRouteIDs.has(r.routeID)),
    [routes, visibleRouteIDs, liveRouteIDs]
  );

  const filteredVehicles = useMemo(
    () =>
      showVehicles
        ? vehicles.filter((v) => visibleRouteIDs.has(v.routeID))
        : [],
    [vehicles, visibleRouteIDs, showVehicles]
  );

  // Stop → routeID[] mapping from official schedules
  const stopRouteMap = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const stop of stops) {
      const routeIDs = STOP_ROUTES[stop.stopID];
      if (routeIDs) map.set(stop.stopID, routeIDs);
    }
    return map;
  }, [stops]);

  // Filter stops: only show those belonging to at least one visible route
  const filteredStops = useMemo(() => {
    if (!showStops) return [];
    return stops.filter((stop) => {
      const routeIDs = stopRouteMap.get(stop.stopID);
      if (!routeIDs) return false;
      return routeIDs.some((id) => visibleRouteIDs.has(id) && liveRouteIDs.has(id));
    });
  }, [stops, stopRouteMap, visibleRouteIDs, liveRouteIDs, showStops]);

  // Don't render until panes exist — avoids fallback to default pane
  if (!panesReady) return null;

  return (
    <>
      {/* Route outlines — white/dark stroke for contrast against road tiles */}
      {filteredRoutes.map((route) => {
        const pts = shapeMap.get(route.shapeID);
        if (!pts || pts.length < 2) return null;
        return (
          <Polyline
            key={`outline-${route.routeID}`}
            positions={pts}
            pane="shuttleRoutesOutline"
            pathOptions={{
              color: dark ? "#1a1a2e" : "#ffffff",
              weight: 9,
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}

      {/* Route colored lines */}
      {filteredRoutes.map((route) => {
        const pts = shapeMap.get(route.shapeID);
        if (!pts || pts.length < 2) return null;
        return (
          <Polyline
            key={`route-${route.routeID}`}
            positions={pts}
            pane="shuttleRoutes"
            pathOptions={{
              color: routeColor(route),
              weight: 5,
              opacity: 0.65,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}

      {/* Direction arrows on route polylines */}
      <RouteArrows routes={filteredRoutes} shapeMap={shapeMap} />

      {/* Stop markers — colored by route */}
      {filteredStops.map((stop) => {
        const routeIDs = stopRouteMap.get(stop.stopID) ?? [];
        // Filter to only visible+live routes for coloring
        const activeRouteIDs = routeIDs.filter(
          (id) => visibleRouteIDs.has(id) && liveRouteIDs.has(id),
        );
        const activeRoutes = activeRouteIDs
          .map((id) => routeMap.get(id))
          .filter((r): r is ShuttleRoute => !!r);

        const popupContent = (
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            <strong>{stop.longName}</strong>
            {activeRoutes.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {activeRoutes.map((r) => (
                  <div key={r.routeID} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: routeColor(r),
                      }}
                    />
                    {r.longName}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

        if (activeRoutes.length === 1) {
          // Single-route stop: simple colored circle
          return (
            <CircleMarker
              key={`stop-${stop.stopID}`}
              center={[stop.lat, stop.lng]}
              radius={5}
              pane="shuttleStops"
              pathOptions={{
                fillColor: routeColor(activeRoutes[0]),
                fillOpacity: 0.9,
                color: dark ? "#555" : "#fff",
                weight: 2,
              }}
            >
              <Popup>{popupContent}</Popup>
            </CircleMarker>
          );
        }

        // Multi-route stop: pie chart icon
        const colors = activeRoutes.map((r) => routeColor(r));
        const icon = buildPieIcon(colors, dark);
        return (
          <Marker
            key={`stop-${stop.stopID}`}
            position={[stop.lat, stop.lng]}
            icon={icon}
            pane="shuttleStops"
          >
            <Popup>{popupContent}</Popup>
          </Marker>
        );
      })}

      {/* Vehicle markers */}
      {filteredVehicles.map((veh) => {
        const route = routeMap.get(veh.routeID);
        const color = route ? routeColor(route) : "#3b82f6";
        const routeName = route ? route.longName : "Unknown";
        return (
          <CircleMarker
            key={`vehicle-${veh.vehicleID}`}
            center={[veh.lat, veh.lng]}
            radius={10}
            pane="shuttleVehicles"
            pathOptions={{
              fillColor: color,
              fillOpacity: 1,
              color: "#fff",
              weight: 3,
            }}
          >
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                <strong>{veh.vehicleName}</strong>
                <br />
                Route: {routeName}
                <br />
                Speed: {Math.round(veh.speed)} mph
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
