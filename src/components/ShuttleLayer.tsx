"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
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

interface ShuttleLayerProps {
  dark: boolean;
  enabledRoutes?: Set<number>;
}

/** Creates a custom Leaflet pane so shuttle polylines render above road labels. */
function useShuttlePane() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("shuttleRoutes")) {
      const pane = map.createPane("shuttleRoutes");
      pane.style.zIndex = "450"; // above overlayPane (400) and road labels
    }
    if (!map.getPane("shuttleRoutesOutline")) {
      const pane = map.createPane("shuttleRoutesOutline");
      pane.style.zIndex = "449";
    }
  }, [map]);
}

export default function ShuttleLayer({ dark, enabledRoutes }: ShuttleLayerProps) {
  useShuttlePane();
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

  const filteredRoutes = useMemo(
    () =>
      enabledRoutes
        ? routes.filter((r) => enabledRoutes.has(r.routeID))
        : routes,
    [routes, enabledRoutes]
  );

  const filteredVehicles = useMemo(
    () =>
      enabledRoutes
        ? vehicles.filter((v) => enabledRoutes.has(v.routeID))
        : vehicles,
    [vehicles, enabledRoutes]
  );

  const filteredStops = stops; // show all stops regardless of route filter

  return (
    <>
      {/* Route polylines — outline for contrast against road lines */}
      {filteredRoutes.map((route) => {
        const pts = shapeMap.get(route.shapeID);
        if (!pts || pts.length < 2) return null;
        return (
          <Polyline
            key={`route-outline-${route.routeID}`}
            positions={pts}
            pane="shuttleRoutesOutline"
            pathOptions={{
              color: dark ? "#1a1a2e" : "#ffffff",
              weight: 8,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}
      {/* Route polylines — colored line on top */}
      {filteredRoutes.map((route) => {
        const pts = shapeMap.get(route.shapeID);
        if (!pts || pts.length < 2) return null;
        return (
          <Polyline
            key={`route-${route.routeID}`}
            positions={pts}
            pane="shuttleRoutes"
            pathOptions={{
              color: `#${route.color}`,
              weight: 5,
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}

      {/* Stop markers */}
      {filteredStops.map((stop) => (
        <CircleMarker
          key={`stop-${stop.stopID}`}
          center={[stop.lat, stop.lng]}
          radius={5}
          pathOptions={{
            fillColor: dark ? "#a0a0cc" : "#555",
            fillOpacity: 0.9,
            color: dark ? "#555" : "#fff",
            weight: 2,
          }}
        >
          <Popup>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{stop.longName}</span>
          </Popup>
        </CircleMarker>
      ))}

      {/* Vehicle markers */}
      {filteredVehicles.map((veh) => {
        const route = routeMap.get(veh.routeID);
        const color = route ? `#${route.color}` : "#3b82f6";
        const routeName = route ? route.longName : "Unknown";
        return (
          <CircleMarker
            key={`vehicle-${veh.vehicleID}`}
            center={[veh.lat, veh.lng]}
            radius={9}
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

export { type ShuttleLayerProps };
