import {
  getARProjection as getARProjectionUtil,
  ARStage,
  ProjectedPoint,
  DeviceOrientation,
  WGS84Location,
  wgs84ToEnu,
  projectEnuToScreen,
  projectGpsPathWithElevationToCanvas,
} from '../utils/arProjection';

export type { ProjectedPoint, DeviceOrientation, WGS84Location };
export { ARStage, wgs84ToEnu, projectEnuToScreen, projectGpsPathWithElevationToCanvas };

export interface POICoordinates {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  elevation?: number;
}

export const getARProjection = (
  userLocation: UserLocation | null,
  orientation: DeviceOrientation,
  poiCoords: POICoordinates
): ProjectedPoint => {
  return getARProjectionUtil(userLocation, orientation, poiCoords);
};

export const useARProjection = getARProjection;
