import maplibregl from 'maplibre-gl';
import { OfflinePlugin, OFFLINE_STATUS, type OfflineProgress } from '@makina-corpus/maplibre-offline-pmtiles';
import * as pmtiles from 'pmtiles';

export { OfflinePlugin, OFFLINE_STATUS, type OfflineProgress };

/**
 * Singleton OfflinePlugin instance from @makina-corpus/maplibre-offline-pmtiles
 */
export const offlinePlugin = new OfflinePlugin();

let isProtocolRegistered = false;
let downloadPromise: Promise<boolean> | null = null;

/**
 * Pre-cache Tuzla PMTiles in OPFS in the background if supported,
 * without blocking immediate map rendering.
 */
export async function ensureTuzlaOfflineMapDownloaded(
  onProgress?: (progress: OfflineProgress) => void
): Promise<boolean> {
  if (downloadPromise) return downloadPromise;

  downloadPromise = (async () => {
    try {
      globalPMTilesProtocol.init();

      if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) {
        return false;
      }

      const root = await navigator.storage.getDirectory();
      let exists = false;
      try {
        const handle = await root.getFileHandle('tuzla.pmtiles');
        const file = await handle.getFile();
        if (file && file.size > 1000000) {
          exists = true;
        }
      } catch {
        exists = false;
      }

      if (!exists) {
        await offlinePlugin.downloadMap(
          '/maps/tuzla.pmtiles',
          'tuzla',
          (prog) => {
            if (onProgress) onProgress(prog);
          },
          '/maps/offline-vector-style.json'
        );
      }
      return true;
    } catch (err) {
      console.warn('OPFS background cache warning (using direct stream):', err);
      return false;
    }
  })();

  return downloadPromise;
}

/**
 * Custom PMTiles Fetch Source with in-memory buffer fallback.
 * Solves the issue where static servers (like Vite dev/preview) or Service Workers
 * return HTTP 200 (full file) instead of HTTP 206 (partial content) for Range requests.
 */
class RobustFetchSource implements pmtiles.Source {
  private url: string;
  private fullBufferPromise: Promise<ArrayBuffer> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  getKey(): string {
    return this.url;
  }

  private async fetchFullBuffer(): Promise<ArrayBuffer> {
    if (!this.fullBufferPromise) {
      this.fullBufferPromise = (async () => {
        const response = await fetch(this.url, { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`Failed to load full PMTiles archive from ${this.url}: ${response.status} ${response.statusText}`);
        }
        return await response.arrayBuffer();
      })();
    }
    return this.fullBufferPromise;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
    etag?: string
  ): Promise<pmtiles.RangeResponse> {
    const headers = new Headers();
    headers.set('Range', `bytes=${offset}-${offset + length - 1}`);

    try {
      const response = await fetch(this.url, {
        signal,
        headers,
        cache: 'no-cache',
      });

      if (response.status === 206) {
        const data = await response.arrayBuffer();
        return {
          data,
          etag: response.headers.get('ETag') || undefined,
          cacheControl: response.headers.get('Cache-Control') || undefined,
          expires: response.headers.get('Expires') || undefined,
        };
      }

      // If server returned 200 OK (ignored Range header and returned whole file)
      if (response.status === 200) {
        const fullBuffer = await response.arrayBuffer();
        this.fullBufferPromise = Promise.resolve(fullBuffer);
        const sliced = fullBuffer.slice(offset, offset + length);
        return {
          data: sliced,
          etag: response.headers.get('ETag') || undefined,
          cacheControl: response.headers.get('Cache-Control') || undefined,
          expires: response.headers.get('Expires') || undefined,
        };
      }

      if (response.status >= 300) {
        throw new Error(`PMTiles fetch error: ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw err;
      }
      console.warn(`Range request failed for ${this.url}, falling back to full buffered archive:`, err);
    }

    const fullBuffer = await this.fetchFullBuffer();
    const sliced = fullBuffer.slice(offset, offset + length);
    return { data: sliced };
  }
}

/**
 * Unified PMTiles & Offline Protocol manager for MapLibre GL JS.
 * Supports both `pmtiles://` and `offline-pmtiles://` with automatic fallbacks.
 */
class RobustPMTilesProtocol {
  private tilesMap = new Map<string, pmtiles.PMTiles>();

  private getPMTiles(rawUrl: string): pmtiles.PMTiles {
    let resolvedUrl = rawUrl;
    if (typeof window !== 'undefined' && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      resolvedUrl = new URL(rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`, window.location.href).href;
    }

    let instance = this.tilesMap.get(resolvedUrl);
    if (!instance) {
      const source = new RobustFetchSource(resolvedUrl);
      instance = new pmtiles.PMTiles(source);
      this.tilesMap.set(resolvedUrl, instance);
    }
    return instance;
  }

  public init() {
    if (isProtocolRegistered) return;

    // 1. Register offline-pmtiles protocol from @makina-corpus/maplibre-offline-pmtiles
    try {
      OfflinePlugin.registerProtocol(maplibregl);
    } catch (err) {
      console.warn('OfflinePlugin registerProtocol notice:', err);
    }

    // 2. Register pmtiles protocol handler for MapLibre GL JS v4/v5
    maplibregl.addProtocol('pmtiles', async (params: any, abortController?: AbortController) => {
      const url: string = params.url || '';

      // TileJSON metadata request (e.g. "pmtiles:///maps/tuzla.pmtiles")
      if (params.type === 'json') {
        const rawUrl = url.replace(/^pmtiles:\/\//, '');
        const instance = this.getPMTiles(rawUrl);
        const header = await instance.getHeader();
        return {
          data: {
            tilejson: '3.0.0',
            scheme: 'xyz',
            tiles: [`pmtiles://${rawUrl}/{z}/{x}/{y}`],
            minzoom: header.minZoom,
            maxzoom: header.maxZoom,
            bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
          },
        };
      }

      // Tile request (e.g. "pmtiles:///maps/tuzla.pmtiles/14/9041/5923")
      const tileMatch = url.match(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
      if (tileMatch) {
        const rawUrl = tileMatch[1];
        const z = parseInt(tileMatch[2], 10);
        const x = parseInt(tileMatch[3], 10);
        const y = parseInt(tileMatch[4], 10);

        const instance = this.getPMTiles(rawUrl);
        const signal = abortController?.signal;
        const resp = await instance.getZxy(z, x, y, signal);

        if (resp && resp.data) {
          return {
            data: resp.data, // ArrayBuffer decoded MVT vector tile
            cacheControl: resp.cacheControl,
            expires: resp.expires,
          };
        }
        return { data: new ArrayBuffer(0) };
      }

      throw new Error(`Unrecognized pmtiles URL: ${url}`);
    });

    isProtocolRegistered = true;
    console.log('✅ PMTiles protocol initialized and registered for MapLibre');
  }
}

export const globalPMTilesProtocol = new RobustPMTilesProtocol();
