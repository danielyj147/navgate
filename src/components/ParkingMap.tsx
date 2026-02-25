"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { parkingLots } from "@/data/lots";
import { getEasternTime } from "@/lib/time-utils";
import { getLotStatus } from "@/lib/availability";
import { LotStatus, ParkingLot, StatusColor } from "@/types";

import LotMarker from "./LotMarker";
import MapLegend from "./MapLegend";
import TimeDisplay from "./TimeDisplay";
import LotListPanel from "./LotListPanel";
import ShuttleLayer from "./ShuttleLayer";
import ShuttlePanel from "./ShuttlePanel";

const CAMPUS_CENTER: [number, number] = [42.8172, -75.5385];
const UPDATE_INTERVAL = 15_000;

const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

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
  const [enabledRoutes, setEnabledRoutes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  const toggleRoute = useCallback((routeID: number) => {
    setEnabledRoutes((prev) => {
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
      {/* Sidebar: parking panel or shuttle panel */}
      {shuttleMode ? (
        <ShuttlePanel
          dark={isDark}
          enabledRoutes={enabledRoutes}
          onToggleRoute={toggleRoute}
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
          <TileLayer
            key={isDark ? "dark" : "light"}
            attribution={ATTRIBUTION}
            url={isDark ? DARK_TILES : LIGHT_TILES}
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
          {shuttleMode && (
            <ShuttleLayer
              dark={isDark}
              enabledRoutes={enabledRoutes.size > 0 ? enabledRoutes : undefined}
            />
          )}
          <FlyToLot lot={selectedLot} />
        </MapContainer>
        <MapLegend dark={isDark} />
        <TimeDisplay easternTime={easternTime} dark={isDark} />
      </div>
    </div>
  );
}
