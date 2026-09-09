import { useState, useEffect, useRef } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  elevation: number | null;
  accuracy: number;
  timestamp: number;
}

type Listener = (pos: GeoPosition | null, error: GeolocationPositionError | null) => void;

class GeolocationWatcherManager {
  private watchId: number | null = null;
  private listeners: Set<Listener> = new Set();
  private cachedPosition: GeoPosition | null = null;
  private lastError: GeolocationPositionError | null = null;
  private hasPermission = true;

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    // Immediately replay cached position or error if available
    if (this.cachedPosition || this.lastError) {
      listener(this.cachedPosition, this.lastError);
    }

    // Start hardware GPS watch on first subscriber
    if (this.listeners.size === 1) {
      this.startWatch();
    }

    return () => {
      this.listeners.delete(listener);
      // Stop watch when last subscriber unsubscribes
      if (this.listeners.size === 0) {
        this.stopWatch();
      }
    };
  }

  public getCachedPosition(): GeoPosition | null {
    return this.cachedPosition;
  }

  public getHasPermission(): boolean {
    return this.hasPermission;
  }

  private startWatch(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.hasPermission = false;
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.hasPermission = true;
        this.lastError = null;
        const newPos: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          elevation: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        this.cachedPosition = newPos;
        this.notify(newPos, null);
      },
      (err) => {
        this.lastError = err;
        if (err.code === err.PERMISSION_DENIED) {
          this.hasPermission = false;
        }
        this.notify(this.cachedPosition, err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );
  }

  private stopWatch(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private notify(pos: GeoPosition | null, err: GeolocationPositionError | null): void {
    this.listeners.forEach((listener) => {
      try {
        listener(pos, err);
      } catch (e) {
        console.error('Error in GeolocationWatcher listener:', e);
      }
    });
  }
}

const manager = new GeolocationWatcherManager();

export interface UseGeolocationWatcherOptions {
  enabled?: boolean;
  onError?: (err: GeolocationPositionError) => void;
}

export function useGeolocationWatcher(options?: UseGeolocationWatcherOptions) {
  const enabled = options?.enabled ?? true;
  const onError = options?.onError;

  const [position, setPosition] = useState<GeoPosition | null>(() => manager.getCachedPosition());
  const [hasPermission, setHasPermission] = useState<boolean>(() => manager.getHasPermission());
  const positionRef = useRef<GeoPosition | null>(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = manager.subscribe((pos, err) => {
      setHasPermission(manager.getHasPermission());
      if (pos) {
        setPosition(pos);
        positionRef.current = pos;
      }
      if (err && onErrorRef.current) {
        onErrorRef.current(err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled]);

  return { position, positionRef, hasPermission };
}
