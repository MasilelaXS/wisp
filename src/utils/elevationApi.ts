import type { LatLng, ElevationPoint } from '../types';

const OPEN_TOPO_API = import.meta.env.DEV
  ? '/api/topo/v1/srtm30m'
  : 'https://corsproxy.io/?url=' + encodeURIComponent('https://api.opentopodata.org/v1/srtm30m');
const RATE_LIMIT_MS = 1100;
const BATCH_SIZE = 100;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchElevationProfile(
  pointA: LatLng,
  pointB: LatLng,
  numSamples = 100,
  signal?: AbortSignal,
): Promise<ElevationPoint[]> {
  // Generate intermediate points along the path
  const locations: LatLng[] = [];
  for (let i = 0; i < numSamples; i++) {
    const fraction = i / (numSamples - 1);
    locations.push({
      lat: pointA.lat + (pointB.lat - pointA.lat) * fraction,
      lng: pointA.lng + (pointB.lng - pointA.lng) * fraction,
    });
  }

  const totalDistance = haversineDistance(pointA, pointB);
  const elevations = await fetchBatchElevations(locations, signal);

  return elevations.map((elev, i) => ({
    lat: locations[i].lat,
    lng: locations[i].lng,
    elevation: elev,
    distance: (i / (numSamples - 1)) * totalDistance,
  }));
}

export async function fetchBatchElevations(
  locations: LatLng[],
  signal?: AbortSignal,
): Promise<number[]> {
  if (locations.length === 0) return [];

  const results: number[] = [];

  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (i > 0) await sleep(RATE_LIMIT_MS);

    const batch = locations.slice(i, i + BATCH_SIZE);
    const locString = batch.map(l => `${l.lat},${l.lng}`).join('|');
    const url = `${OPEN_TOPO_API}?locations=${locString}&interpolation=bilinear`;

    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Elevation API error: ${response.status}`);

    const data = await response.json();
    if (data.status !== 'OK') throw new Error(`Elevation API: ${data.status}`);

    for (const result of data.results) {
      results.push(result.elevation ?? 0);
    }
  }

  return results;
}

export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}
