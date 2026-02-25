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
