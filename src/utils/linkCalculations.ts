import type {
  ElevationPoint,
  PathAnalysisResult,
  LinkSummary,
  QuickLosResult,
  LinkQuality,
  LinkStatus,
  WorstPoint,
} from '../types';

const EARTH_RADIUS = 6371000;
const K_FACTOR = 4 / 3;
const SPEED_OF_LIGHT = 299792458;

export function earthCurvature(d: number, D: number): number {
  return (d * (D - d)) / (2 * EARTH_RADIUS * K_FACTOR);
}

export function fresnelRadius(d1: number, d2: number, frequencyGHz: number, n = 1): number {
  const wavelength = SPEED_OF_LIGHT / (frequencyGHz * 1e9);
  const D = d1 + d2;
  if (D === 0) return 0;
  return Math.sqrt((n * wavelength * d1 * d2) / D);
}

function classifyQuality(worstPercent: number): { quality: LinkQuality; status: LinkStatus; color: string } {
  if (worstPercent >= 100) return { quality: 'Excellent', status: 'clear', color: '#22c55e' };
  if (worstPercent >= 60) return { quality: 'Good', status: 'clear', color: '#84cc16' };
  if (worstPercent >= 20) return { quality: 'Marginal', status: 'marginal', color: '#eab308' };
  if (worstPercent >= 0) return { quality: 'Poor', status: 'marginal', color: '#f97316' };
  return { quality: 'Obstructed', status: 'obstructed', color: '#ef4444' };
}

export function analyzePath(
  elevationProfile: ElevationPoint[],
  txHeight: number,
  rxHeight: number,
  frequencyGHz: number,
): PathAnalysisResult {
  const totalDistance = elevationProfile[elevationProfile.length - 1].distance;
  const txGroundElev = elevationProfile[0].elevation;
  const rxGroundElev = elevationProfile[elevationProfile.length - 1].elevation;
  const txElev = txGroundElev + txHeight;
  const rxElev = rxGroundElev + rxHeight;

  let worstClearance = Infinity;
  let worstClearancePercent = 100;
  let worstPoint: WorstPoint | null = null;
  let obstructionCount = 0;

  const pathPoints = elevationProfile.map((point) => {
    const d = point.distance;
    const fraction = totalDistance > 0 ? d / totalDistance : 0;
    const losHeight = txElev + (rxElev - txElev) * fraction;
    const curvature = earthCurvature(d, totalDistance);
    const effectiveTerrainHeight = point.elevation + curvature;
    const d1 = d;
    const d2 = totalDistance - d;
    const fresnel1 = fresnelRadius(d1, d2, frequencyGHz, 1);
    const clearance = losHeight - effectiveTerrainHeight;
    const clearancePercent = fresnel1 > 0 ? (clearance / fresnel1) * 100 : 100;
    const isObstructed = clearance < 0;
    if (isObstructed) obstructionCount++;

    if (clearancePercent < worstClearancePercent) {
      worstClearancePercent = clearancePercent;
      worstClearance = clearance;
      worstPoint = {
        distance: d,
        elevation: point.elevation,
        effectiveElevation: effectiveTerrainHeight,
        losHeight,
        fresnel1,
        clearance,
        clearancePercent,
      };
    }

    return {
      distance: d,
      elevation: point.elevation,
      effectiveElevation: effectiveTerrainHeight,
      curvature,
      losHeight,
      fresnel1,
      fresnelUpper: losHeight + fresnel1,
      fresnelLower: losHeight - fresnel1,
      clearance,
      clearancePercent,
      isObstructed,
    };
  });

  const { quality, status, color } = classifyQuality(worstClearancePercent);

  return {
    pathPoints,
    totalDistance,
    txGroundElev,
    rxGroundElev,
    txElev,
    rxElev,
    worstClearance,
    worstClearancePercent,
    worstPoint,
    obstructionCount,
    quality,
    status,
    color,
    frequencyGHz,
    txHeight,
    rxHeight,
  };
}

export function getLinkSummary(analysis: PathAnalysisResult): LinkSummary | null {
  if (!analysis || analysis.status === 'error') return null;
  return {
    distance: (analysis.totalDistance / 1000).toFixed(2) + ' km',
    txElevation: analysis.txGroundElev.toFixed(1) + ' m ASL',
    rxElevation: analysis.rxGroundElev.toFixed(1) + ' m ASL',
    txAntennaASL: analysis.txElev.toFixed(1) + ' m ASL',
    rxAntennaASL: analysis.rxElev.toFixed(1) + ' m ASL',
    worstClearance: analysis.worstClearance.toFixed(1) + ' m',
    worstFresnelPercent: analysis.worstClearancePercent.toFixed(0) + '%',
    quality: analysis.quality,
    obstructions: analysis.obstructionCount,
  };
}

interface IntermediatePoint {
  fraction: number;
  elevation: number;
}

export function quickLosCheck(
  clientGroundElev: number,
  clientHeight: number,
  towerGroundElev: number,
  towerHeight: number,
  intermediatePoints: IntermediatePoint[],
  totalDistance: number,
  frequencyGHz: number,
): QuickLosResult {
  const txElev = clientGroundElev + clientHeight;
  const rxElev = towerGroundElev + towerHeight;

  let worstClearance = Infinity;
  let worstClearancePercent = 100;

  for (const point of intermediatePoints) {
    const d = point.fraction * totalDistance;
    const losHeight = txElev + (rxElev - txElev) * point.fraction;
    const curvature = earthCurvature(d, totalDistance);
    const effectiveTerrainHeight = point.elevation + curvature;
    const d1 = d;
    const d2 = totalDistance - d;
    const f1 = fresnelRadius(d1, d2, frequencyGHz);
    const clearance = losHeight - effectiveTerrainHeight;
    const clearancePercent = f1 > 0 ? (clearance / f1) * 100 : 100;

    if (clearancePercent < worstClearancePercent) {
      worstClearancePercent = clearancePercent;
      worstClearance = clearance;
    }
  }

  const { quality, status, color } = classifyQuality(worstClearancePercent);

  return { worstClearance, worstClearancePercent, quality, status, color };
}
