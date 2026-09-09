export * from '../types';

/**
 * Geoapify maneuver instruction classifications
 */
export type ManeuverType =
  | 'Straight'
  | 'Right'
  | 'SlightRight'
  | 'SharpRight'
  | 'Left'
  | 'SlightLeft'
  | 'SharpLeft'
  | 'UTurn'
  | 'Destination'
  | 'WayPoint'
  | 'Start'
  | 'Arrival'
  | string;

/**
 * Supported UI languages in the Tuzla Virtual Guide application
 */
export type LocationCategory = 'nature' | 'culture' | 'shopping' | 'history' | 'food';

/**
 * Multi-language string key map
 */
export type MultiLangText = Record<import('../types').Language, string>;

/**
 * User orientation and location pose payload
 */
export interface UserPose {
  lat: number;
  lng: number;
  elevation: number; // User ground elevation in meters
  heading: number;   // Compass Alpha (0-360 degrees)
  pitch: number;     // Device Beta pitch (-180 to 180 degrees)
  roll?: number;     // Device Gamma roll (-90 to 90 degrees)
  headingAccuracy?: number | null;
}

/**
 * Extended coordinate point with terrain elevation for 3D path polyline projection
 */
export interface PathNodeWithElevation {
  lat: number;
  lng: number;
  elevation: number; // Meters above sea level
}

/**
 * 2D projected screen coordinate result from the AR projection engine
 */
export interface ScreenPoint2D {
  x: number;       // Pixel X coordinate on viewport canvas
  y: number;       // Pixel Y coordinate on viewport canvas
  depth: number;   // Metric distance from camera (Z-depth)
  visible: boolean; // Whether the node is within the camera view frustum
}

/**
 * Active Quest target tracking state
 */
export interface QuestTargetState {
  loc: import('../types').Location;
  dist: number; // Distance in meters to target landmark
  isWithinGeofence: boolean; // True when dist <= 5 meters
}

/**
 * Geoapify Routing API raw response payload structures
 */
export interface GeoapifyRouteResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: [number, number, number?][];
    };
    properties: {
      mode: string;
      waypoints: Array<{
        location: [number, number];
        original_index: number;
      }>;
      legs: Array<{
        distance: number;
        time: number;
        steps: Array<{
          from_index: number;
          to_index: number;
          distance: number;
          time: number;
          instruction?: {
            text?: string;
            type?: string;
          };
        }>;
      }>;
    };
  }>;
}