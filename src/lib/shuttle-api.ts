import { ShuttleVehicle, ShuttleRoute, ShuttleStop, ShuttleShape } from "@/types";

const BASE =
  "https://api.peaktransit.com/v5/index.php?app_id=_RIDER&key=c620b8fe5fdbd6107da8c8381f4345b4";
const AGENCY = 175;

function url(controller: string): string {
  return `${BASE}&controller=${controller}&action=list&agencyID=${AGENCY}`;
}

async function fetchJson<T>(controller: string, key: string): Promise<T[]> {
  const res = await fetch(url(controller));
  if (!res.ok) throw new Error(`Shuttle API error: ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (key in data) return data[key];
  return [];
}

export async function fetchVehicles(): Promise<ShuttleVehicle[]> {
  return fetchJson<ShuttleVehicle>("vehicles2", "vehicles");
}

export async function fetchRoutes(): Promise<ShuttleRoute[]> {
  return fetchJson<ShuttleRoute>("route2", "routes");
}

export async function fetchStops(): Promise<ShuttleStop[]> {
  return fetchJson<ShuttleStop>("stop2", "stop");
}

export async function fetchShapes(): Promise<ShuttleShape[]> {
  return fetchJson<ShuttleShape>("shape2", "shape");
}

export function parseShapePoints(points: string): [number, number][] {
  return points
    .split(";")
    .filter(Boolean)
    .map((pair) => {
      const [lat, lng] = pair.split(",").map(Number);
      return [lat, lng] as [number, number];
    });
}

/** Approximate distance in meters between two lat/lng points using equirectangular projection. */
function approxDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad * Math.cos(((lat1 + lat2) / 2) * toRad);
  return R * Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Minimum distance (meters) from a point to a line segment [a, b]. */
function pointToSegmentDistance(
  point: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return approxDistanceMeters(point[0], point[1], a[0], a[1]);
  const t = Math.max(0, Math.min(1,
    ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy),
  ));
  const projLat = a[0] + t * dx;
  const projLng = a[1] + t * dy;
  return approxDistanceMeters(point[0], point[1], projLat, projLng);
}

/** Minimum distance (meters) from a point to a polyline (array of lat/lng pairs). */
export function pointToPolylineDistance(
  point: [number, number],
  polyline: [number, number][],
): number {
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentDistance(point, polyline[i], polyline[i + 1]);
    if (d < min) min = d;
  }
  return min;
}
