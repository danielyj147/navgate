"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { parkingLots } from "@/data/lots";
import { getEasternTime } from "@/lib/time-utils";
import { getLotStatus } from "@/lib/availability";
import { LotStatus, ParkingLot, StatusColor, ShuttleRoute } from "@/types";
import { fetchRoutes } from "@/lib/shuttle-api";

import LotMarker from "./LotMarker";
import MapLegend from "./MapLegend";
import TimeDisplay from "./TimeDisplay";
import LotListPanel from "./LotListPanel";
import ShuttleLayer from "./ShuttleLayer";
import ShuttlePanel from "./ShuttlePanel";

const CAMPUS_CENTER: [number, number] = [42.8172, -75.5385];
const UPDATE_INTERVAL = 15_000;
const STORAGE_KEY = "colgate-parking-settings";

interface StoredSettings {
  dark?: boolean;
  shuttleMode?: boolean;
  visibleRouteIDs?: number[];
  showVehicles?: boolean;
  showStops?: boolean;
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredSettings;
  } catch {}
  return {};
}

function saveSettings(s: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// Split tiles: base (no labels) + labels overlay — allows shuttle routes between them
const LIGHT_BASE = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";
const LIGHT_LABELS = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";
const DARK_BASE = "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";
const DARK_LABELS = "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

/** Creates a pane for label tiles so they render above shuttle routes but below markers. */
function LabelPane() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("tileLabels")) {
      const p = map.createPane("tileLabels");
      p.style.zIndex = "350";
    }
  }, [map]);
  return null;
}

function DarkMapClass({ dark }: { dark: boolean }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (dark) el.classList.add("dark-map");
    else el.classList.remove("dark-map");
  }, [dark, map]);
  return null;
}

function FlyToLot({ lot }: { lot: ParkingLot | null }) {
  const map = useMap();
  useEffect(() => {
    if (!lot) return;
    const bounds = L.latLngBounds(lot.polygon.map(([lat, lng]) => [lat, lng]));
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 19, duration: 0.8 });
  }, [lot, map]);
  return null;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ParkingMap() {
  const [now, setNow] = useState(() => new Date());
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [dark, setDark] = useState<boolean | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<StatusColor>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  // Shuttle state
  const [shuttleMode, setShuttleMode] = useState(true);
  const [apiRoutes, setApiRoutes] = useState<ShuttleRoute[]>([]);
  const [visibleRouteIDs, setVisibleRouteIDs] = useState<Set<number>>(new Set());
  const [showVehicles, setShowVehicles] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const settingsReadyRef = useRef(false);

  // Restore settings from localStorage and fetch routes on mount (client-side only)
  useEffect(() => {
    const saved = loadSettings();
    if (saved.dark != null) setDark(saved.dark);
    if (saved.shuttleMode != null) setShuttleMode(saved.shuttleMode);
    if (saved.showVehicles != null) setShowVehicles(saved.showVehicles);
    if (saved.showStops != null) setShowStops(saved.showStops);

    fetchRoutes().then((routes) => {
      setApiRoutes(routes);
      if (saved.visibleRouteIDs && saved.visibleRouteIDs.length > 0) {
        setVisibleRouteIDs(new Set(saved.visibleRouteIDs));
      } else {
        setVisibleRouteIDs(new Set(routes.map((r) => r.routeID)));
      }
      // Only start persisting after initial state is fully resolved
      settingsReadyRef.current = true;
    }).catch(() => {
      settingsReadyRef.current = true;
    });

    if (saved.dark == null) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => setDark(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  // Persist settings whenever they change (only after initial restore is done)
  useEffect(() => {
    if (!settingsReadyRef.current) return;
    saveSettings({
      dark: dark ?? undefined,
      shuttleMode,
      visibleRouteIDs: [...visibleRouteIDs],
      showVehicles,
      showStops,
    });
  }, [dark, shuttleMode, visibleRouteIDs, showVehicles, showStops]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), UPDATE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const easternTime = useMemo(() => getEasternTime(now), [now]);

  const statuses = useMemo(() => {
    const map = new Map<string, LotStatus>();
    for (const lot of parkingLots) {
      map.set(lot.id, getLotStatus(lot, easternTime));
    }
    return map;
  }, [easternTime]);

  const lotDistances = useMemo(() => {
    if (!userLocation) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const lot of parkingLots) {
      const d = distanceKm(userLocation[0], userLocation[1], lot.lat, lot.lng);
      map.set(lot.id, d);
    }
    return map;
  }, [userLocation]);

  const filteredLots = useMemo(() => {
    let result = parkingLots.filter((lot) => {
      const status = statuses.get(lot.id);
      if (!status) return false;
      if (search && !lot.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilters.size > 0 && !statusFilters.has(status.color)) return false;
      if (categoryFilters.size > 0) {
        const matches =
          (categoryFilters.has("student") && lot.category === "student") ||
          (categoryFilters.has("employee") && lot.category === "employee") ||
          (categoryFilters.has("overnightExempt") && lot.overnightExempt);
        if (!matches) return false;
      }
      if (nearMeActive) {
        const status2 = statuses.get(lot.id);
        if (status2 && status2.color !== "green" && status2.color !== "yellow") return false;
      }
      return true;
    });

    if (nearMeActive && userLocation) {
      result = [...result].sort((a, b) => {
        return (lotDistances.get(a.id) ?? Infinity) - (lotDistances.get(b.id) ?? Infinity);
      });
    }

    return result;
  }, [statuses, search, statusFilters, categoryFilters, nearMeActive, userLocation, lotDistances]);

  const filteredIds = useMemo(() => new Set(filteredLots.map((l) => l.id)), [filteredLots]);

  const handleLotClick = useCallback((lot: ParkingLot) => {
    setSelectedLot(lot);
  }, []);

  const toggleDark = useCallback(() => setDark((d) => !d), []);

  const toggleStatus = useCallback((color: StatusColor) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(color)) next.delete(color);
      else next.add(color);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((value: string) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const toggleRouteVisibility = useCallback((routeID: number) => {
    setVisibleRouteIDs((prev) => {
      const next = new Set(prev);
      if (next.has(routeID)) next.delete(routeID);
      else next.add(routeID);
      return next;
    });
  }, []);

  const handleNearMe = useCallback(() => {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }
    if (userLocation) {
      setNearMeActive(true);
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setNearMeActive(true);
        setLocatingUser(false);
      },
      () => {
        setLocatingUser(false);
        alert("Could not get your location. Make sure location access is allowed.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [nearMeActive, userLocation]);

  const isDark = dark ?? false;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: isDark ? "#2a2a3d" : "#fff" }}>
      {shuttleMode ? (
        <ShuttlePanel
          dark={isDark}
          apiRoutes={apiRoutes}
          visibleRouteIDs={visibleRouteIDs}
          onToggleRouteVisibility={toggleRouteVisibility}
          showVehicles={showVehicles}
          onToggleVehicles={() => setShowVehicles((v) => !v)}
          showStops={showStops}
          onToggleStops={() => setShowStops((v) => !v)}
          onBack={() => setShuttleMode(false)}
        />
      ) : (
        <LotListPanel
          lots={filteredLots}
          statuses={statuses}
          selectedLotId={selectedLot?.id ?? null}
          dark={isDark}
          search={search}
          onSearchChange={setSearch}
          statusFilters={statusFilters}
          onToggleStatus={toggleStatus}
          categoryFilters={categoryFilters}
          onToggleCategory={toggleCategory}
          onLotClick={handleLotClick}
          onToggleDark={toggleDark}
          nearMeActive={nearMeActive}
          locatingUser={locatingUser}
          onNearMe={handleNearMe}
          lotDistances={lotDistances}
          skipSort={nearMeActive && !!userLocation}
          onShowShuttles={() => setShuttleMode(true)}
        />
      )}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={CAMPUS_CENTER}
          zoom={16}
          className="h-full w-full"
          zoomControl={true}
        >
          <DarkMapClass dark={isDark} />
          <LabelPane />

          {/* Base tiles — no labels, so shuttle routes aren't hidden by road lines */}
          <TileLayer
            key={isDark ? "dark-base" : "light-base"}
            attribution={ATTRIBUTION}
            url={isDark ? DARK_BASE : LIGHT_BASE}
          />

          {/* Shuttle routes render here (z=300+, between base and labels) */}
          <ShuttleLayer
            dark={isDark}
            visibleRouteIDs={visibleRouteIDs}
            showVehicles={showVehicles}
            showStops={showStops}
          />

          {/* Label tiles — road/place names above shuttle routes */}
          <TileLayer
            key={isDark ? "dark-labels" : "light-labels"}
            url={isDark ? DARK_LABELS : LIGHT_LABELS}
            pane="tileLabels"
          />

          {parkingLots.map((lot) => {
            if (!filteredIds.has(lot.id)) return null;
            const status = statuses.get(lot.id)!;
            return (
              <LotMarker
                key={lot.id}
                lot={lot}
                status={status}
                selected={lot.id === selectedLot?.id}
                dark={isDark}
              />
            );
          })}
          {userLocation && nearMeActive && (
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{ fillColor: "#3b82f6", fillOpacity: 1, color: "#fff", weight: 3 }}
            >
              <Popup>Your location</Popup>
            </CircleMarker>
          )}
          <FlyToLot lot={selectedLot} />
        </MapContainer>
        <MapLegend dark={isDark} />
        <TimeDisplay easternTime={easternTime} dark={isDark} />
      </div>
    </div>
  );
}
