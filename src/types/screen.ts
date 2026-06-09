export type StopStatus = "pending" | "delivered" | "canceled";

export type LngLat = [number, number];

export type Route = {
  id: string;
  name: string;
  coords: LngLat;
  distance?: number;
  duration?: number;
  status?: StopStatus;
};

export type GeocodeFeature = {
  id: string;
  place_name: string;
  center: LngLat;
  text: string;
  address?: string;
  place_type?: string[];
  properties?: { address?: string };
  context?: { id: string; text: string }[];
};
