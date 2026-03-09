/**
 * Geospatial utilities — H3 hexagonal indexing and distance calculations.
 * Used across all 4 modules for zone-level aggregation and analysis.
 */

import { latLngToCell, cellToLatLng, gridDisk, cellToChildren, getResolution } from "h3-js";

// Sentinel uses resolution 7 (~5.2 km²), YouthShield uses resolution 8 (~0.74 km²)
export const H3_RES_SENTINEL = 7;
export const H3_RES_YOUTHSHIELD = 8;
export const H3_RES_BLIGHT = 8;

/**
 * Convert lat/lng to H3 index at a given resolution.
 */
export function toH3(lat: number, lng: number, resolution: number = H3_RES_SENTINEL): string {
  return latLngToCell(lat, lng, resolution);
}

/**
 * Get the center coordinates of an H3 cell.
 */
export function h3ToLatLng(h3Index: string): [number, number] {
  return cellToLatLng(h3Index) as [number, number];
}

/**
 * Get neighboring H3 cells within k-ring distance.
 */
export function getNeighbors(h3Index: string, k: number = 1): string[] {
  return gridDisk(h3Index, k);
}

/**
 * Haversine distance in meters between two lat/lng points.
 */
export function distanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Filter points within a radius (meters) of a center point.
 */
export function withinRadius<T extends { latitude?: number | null; longitude?: number | null }>(
  points: T[],
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): T[] {
  return points.filter((p) => {
    if (!p.latitude || !p.longitude) return false;
    return distanceMeters(centerLat, centerLng, p.latitude, p.longitude) <= radiusMeters;
  });
}

/**
 * Group records by H3 index.
 */
export function groupByH3<T extends { h3Index?: string | null }>(
  records: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const r of records) {
    if (!r.h3Index) continue;
    const arr = groups.get(r.h3Index) || [];
    arr.push(r);
    groups.set(r.h3Index, arr);
  }
  return groups;
}

/**
 * Montgomery, AL bounding box for validation.
 */
export const MONTGOMERY_BOUNDS = {
  north: 32.45,
  south: 32.30,
  east: -86.15,
  west: -86.45,
};

export function isInMontgomery(lat: number, lng: number): boolean {
  return (
    lat >= MONTGOMERY_BOUNDS.south &&
    lat <= MONTGOMERY_BOUNDS.north &&
    lng >= MONTGOMERY_BOUNDS.west &&
    lng <= MONTGOMERY_BOUNDS.east
  );
}
