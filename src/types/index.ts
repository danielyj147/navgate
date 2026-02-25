export type LotCategory = "student" | "employee" | "restricted";

export type StatusColor = "green" | "yellow" | "orange" | "red";

export type StatusLabel =
  | "Available"
  | "Available soon"
  | "Unavailable soon"
  | "Not available";

export interface ParkingLot {
  id: string;
  name: string;
  category: LotCategory;
  overnightExempt: boolean;
  lat: number;
  lng: number;
  polygon: [number, number][];
}

export interface LotStatus {
  color: StatusColor;
  label: StatusLabel;
  reason: string;
}

export interface ShuttleVehicle {
  vehicleID: number;
  vehicleName: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  routeID: number;
  APCPercentage: number;
  positionUpdated: number;
}

export interface ShuttleRoute {
  routeID: number;
  shortName: string;
  longName: string;
  color: string;
  shapeID: number;
}

export interface ShuttleStop {
  stopID: number;
  longName: string;
  lat: number;
  lng: number;
}

export interface ShuttleShape {
  shapeID: number;
  points: string;
}
