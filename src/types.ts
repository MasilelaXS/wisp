export interface LatLng {
  lat: number;
  lng: number;
}

export interface Tower {
  id: number;
  name: string;
  lat: number;
  lng: number;
  height: number;
}

export interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number;
  distance: number;
}

export interface PathPoint {
  distance: number;
  elevation: number;
  effectiveElevation: number;
  curvature: number;
  losHeight: number;
  fresnel1: number;
  fresnelUpper: number;
  fresnelLower: number;
  clearance: number;
  clearancePercent: number;
  isObstructed: boolean;
}

export type LinkStatus = 'clear' | 'marginal' | 'obstructed' | 'out-of-range' | 'error';
export type LinkQuality = 'Excellent' | 'Good' | 'Marginal' | 'Poor' | 'Obstructed' | 'Out of Range';

export interface WorstPoint {
  distance: number;
  elevation: number;
  effectiveElevation: number;
  losHeight: number;
  fresnel1: number;
  clearance: number;
  clearancePercent: number;
}

export interface PathAnalysisResult {
  pathPoints: PathPoint[];
  totalDistance: number;
  txGroundElev: number;
  rxGroundElev: number;
  txElev: number;
  rxElev: number;
  worstClearance: number;
  worstClearancePercent: number;
  worstPoint: WorstPoint | null;
  obstructionCount: number;
  quality: LinkQuality;
  status: LinkStatus;
  color: string;
  frequencyGHz: number;
  txHeight: number;
  rxHeight: number;
}

export interface QuickLosResult {
  worstClearance: number;
  worstClearancePercent: number;
  quality: LinkQuality;
  status: LinkStatus;
  color: string;
}

export interface ScanResult extends QuickLosResult {
  tower: Tower;
  distance: number;
  towerGroundElev?: number;
  clientGroundElev?: number;
}

export interface LinkSummary {
  distance: string;
  txElevation: string;
  rxElevation: string;
  txAntennaASL: string;
  rxAntennaASL: string;
  worstClearance: string;
  worstFresnelPercent: string;
  quality: string;
  obstructions: number;
}
