import { useState, useEffect, useRef } from 'react';

export interface WGS84Location {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface ENUCoordinate {
  x: number; // East in meters
  y: number; // North in meters
  z: number; // Up in meters
}

export interface DeviceOrientation {
  alpha: number | null; // Compass yaw
  beta: number | null;  // Device pitch
  gamma: number | null; // Device roll
}

export enum ARStage {
  LONG_RANGE = 'LONG_RANGE',
  DISCOVERY = 'DISCOVERY',
  TARGET_LOCK = 'TARGET_LOCK',
  PRECISE = 'PRECISE',
}

export interface ProjectedPoint {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  pxX: number; // screen pixel X
  pxY: number; // screen pixel Y
  isVisible: boolean;
  distance: number;
  stage: ARStage;
  scale: number;
  relativeBearing: number;
  zCam: number;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

const WGS84_EARTH_RADIUS = 6378137;
const DEFAULT_FOV_Y = 60;

/**
 * PRO FIX: Adaptive Low-Pass Filter for GPS.
 * Smooths coordinates when far away to prevent map/AR jitter, 
 * but allows raw precision when close to the target.
 */
export class AdaptiveLowPassFilter {
  private smoothedLat: number | null = null;
  private smoothedLng: number | null = null;

  private getAlpha(distance: number): number {
    if (distance < 15) return 0.9;  // Very close: trust raw GPS
    if (distance < 50) return 0.6;  // Close: moderate smoothing
    if (distance < 200) return 0.3; // Medium: heavy smoothing
    return 0.1;                     // Far: very heavy smoothing
  }

  update(lat: number, lng: number, distance: number) {
    const alpha = this.getAlpha(distance);
    if (this.smoothedLat === null) {
      this.smoothedLat = lat;
      this.smoothedLng = lng;
    } else {
      this.smoothedLat += alpha * (lat - this.smoothedLat);
      this.smoothedLng += alpha * (lng - this.smoothedLng);
    }
    return { lat: this.smoothedLat, lng: this.smoothedLng };
  }

  reset() {
    this.smoothedLat = null;
    this.smoothedLng = null;
  }
}

/**
 * PRO FIX: Standard EMA for Pitch/Roll to prevent vertical hand-jitter
 */
export function smoothAngle(newVal: number, prevVal: number | null, factor: number = 0.2): number {
  if (prevVal === null) return newVal;
  return prevVal + factor * (newVal - prevVal);
}

export function computeTiltCompensatedHeading(
  alpha: number | null,
  beta: number | null,
  gamma: number | null,
  webkitCompassHeading?: number
): number | null {
  if (webkitCompassHeading !== undefined && webkitCompassHeading !== null) {
    return (webkitCompassHeading + 360) % 360;
  }
  if (alpha === null) return null;
  if (beta === null || gamma === null) {
    return (360 - alpha) % 360;
  }

  const degToRad = Math.PI / 180;
  const a = alpha * degToRad;
  const b = beta * degToRad;
  const g = gamma * degToRad;

  const cA = Math.cos(a);
  const sA = Math.sin(a);
  const sB = Math.sin(b);
  const cG = Math.cos(g);
  const sG = Math.sin(g);

  // Back-camera direction vector in horizontal ground plane
  const worldX = -cA * sG - sA * sB * cG;
  const worldY = -sA * sG + cA * sB * cG;

  const headingRad = Math.atan2(worldX, worldY);
  let headingDeg = (headingRad * 180) / Math.PI;
  if (headingDeg < 0) headingDeg += 360;
  return headingDeg;
}

export function wgs84ToEnu(poi: WGS84Location, origin: WGS84Location): ENUCoordinate {
  const originLatRad = (origin.lat * Math.PI) / 180;
  const dLatRad = ((poi.lat - origin.lat) * Math.PI) / 180;
  const dLngRad = ((poi.lng - origin.lng) * Math.PI) / 180;
  const x = WGS84_EARTH_RADIUS * dLngRad * Math.cos(originLatRad);
  const y = WGS84_EARTH_RADIUS * dLatRad;

  // PRO FIX: When POI elevation is not explicitly given, assume it is at the same ground elevation as user.
  // This prevents negative height discrepancies (-230m in Tuzla) that drop distant POIs underground.
  const hasPoiElevation = poi.elevation !== undefined && poi.elevation !== null && poi.elevation !== 0;
  const hasOriginElevation = origin.elevation !== undefined && origin.elevation !== null && origin.elevation !== 0;
  const z = (hasPoiElevation && hasOriginElevation)
    ? (poi.elevation! - origin.elevation! - 1.5)
    : 0; // Eye-level optical horizon

  return { x, y, z };
}

export function smoothHeading(newAlpha: number, prevAlpha: number | null, factor: number = 0.18): number {
  if (prevAlpha === null) return (newAlpha + 360) % 360;
  const diff = (((newAlpha - prevAlpha) + 540) % 360) - 180;
  return (prevAlpha + factor * diff + 360) % 360;
}

export function stageForDistance(distanceMeters: number): ARStage {
  if (distanceMeters < 10) return ARStage.PRECISE;
  if (distanceMeters < 50) return ARStage.TARGET_LOCK;
  if (distanceMeters < 5000) return ARStage.DISCOVERY; // Extended from 2000m to 5000m for citywide visibility
  return ARStage.LONG_RANGE;
}

export function projectEnuToScreen(
  enu: ENUCoordinate,
  orientation: DeviceOrientation,
  screen: ScreenDimensions = { width: typeof window !== 'undefined' ? window.innerWidth : 1000, height: typeof window !== 'undefined' ? window.innerHeight : 1000 },
  fovYDeg: number = DEFAULT_FOV_Y
): ProjectedPoint {
  const horizontalDist = Math.sqrt(enu.x * enu.x + enu.y * enu.y);
  const totalDist = Math.sqrt(enu.x * enu.x + enu.y * enu.y + enu.z * enu.z);
  const stage = stageForDistance(totalDist);

  const heading = orientation.alpha ?? 0;
  const pitchRaw = orientation.beta ?? 90;

  const worldBearingRad = Math.atan2(enu.x, enu.y);
  const worldBearingDeg = (worldBearingRad * 180) / Math.PI;

  let relativeBearing = (((worldBearingDeg - heading) + 540) % 360) - 180;
  const relBearingRad = (relativeBearing * Math.PI) / 180;
  const zCam = horizontalDist * Math.cos(relBearingRad);

  const pitchOffsetDeg = pitchRaw - 90;
  const elevationAngleDeg = (Math.atan2(enu.z, Math.max(0.1, horizontalDist)) * 180) / Math.PI;
  const relativeVerticalDeg = elevationAngleDeg - pitchOffsetDeg;

  const aspect = screen.width / Math.max(1, screen.height);
  const halfFovYRad = (fovYDeg * Math.PI) / 360;
  const tanHalfFovY = Math.tan(halfFovYRad);
  const tanHalfFovX = tanHalfFovY * aspect;
  const fovXDeg = (2 * Math.atan(tanHalfFovX) * 180) / Math.PI;

  const tanRelHorizontal = Math.tan(relBearingRad);
  const tanRelVertical = Math.tan((relativeVerticalDeg * Math.PI) / 180);

  const pxX = (tanRelHorizontal / tanHalfFovX) * (screen.width / 2) + screen.width / 2;
  const rawPxY = screen.height / 2 - (tanRelVertical / tanHalfFovY) * (screen.height / 2);

  const pctX = (pxX / Math.max(1, screen.width)) * 100;
  let pctY = (rawPxY / Math.max(1, screen.height)) * 100;

  // PRO FIX: Horizon clamping for distant POIs (100m - 5000m) so hand pitch tilts don't lose the badge
  if (totalDist > 80) {
    pctY = Math.min(78, Math.max(22, pctY));
  }

  const isVisible =
    zCam > 0.1 &&
    Math.abs(relativeBearing) <= fovXDeg / 2 &&
    (totalDist > 80 ? Math.abs(relativeVerticalDeg) <= 50 : Math.abs(relativeVerticalDeg) <= fovYDeg / 2);

  // Scaled for comfortable readability across 10m to 3000m
  const scale = Math.min(2.0, Math.max(0.75, 2.0 - totalDist / 200));

  return {
    x: Math.min(150, Math.max(-50, pctX)),
    y: Math.min(150, Math.max(-50, pctY)),
    pxX,
    pxY: (pctY / 100) * screen.height,
    isVisible,
    distance: totalDist,
    stage,
    scale,
    relativeBearing,
    zCam,
  };
}

export function getARProjection(
  userLocation: WGS84Location | null,
  orientation: DeviceOrientation,
  poiCoords: WGS84Location,
  screen?: ScreenDimensions
): ProjectedPoint {
  if (!userLocation) {
    return { x: 50, y: 50, pxX: 0, pxY: 0, isVisible: false, distance: Infinity, stage: ARStage.LONG_RANGE, scale: 1, relativeBearing: 0, zCam: 0 };
  }
  const enu = wgs84ToEnu(poiCoords, userLocation);
  return projectEnuToScreen(enu, orientation, screen);
}

export function projectGpsPathWithElevationToCanvas(
  polyline: Array<[number, number, number?]>,
  userLocation: WGS84Location,
  orientation: DeviceOrientation,
  canvasWidth: number,
  canvasHeight: number
): ProjectedPoint[] {
  const screen = { width: canvasWidth, height: canvasHeight };
  return polyline.map(([lat, lng, elevation]) => {
    const enu = wgs84ToEnu({ lat, lng, elevation }, userLocation);
    return projectEnuToScreen(enu, orientation, screen);
  });
}