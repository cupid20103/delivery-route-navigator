export type LngLat = [number, number];

export type Route = {
  id: string;
  name: string;
  coords: LngLat;
  distance?: number;
  duration?: number;
};

export type DirectionsLeg = { distance: number; duration: number };

export type OptimizationTrip = {
  geometry: GeoJSON.LineString;
};

export type OptimizationResponse = {
  code: string;
  trips: OptimizationTrip[];
};
