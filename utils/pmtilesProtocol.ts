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
 * Normalizes PMTiles URLs to prevent double-slash / protocol-relative hostname bugs.
 */
export function normalizePMTilesUrl(rawUrl: string): { key: string; fetchUrl: string } {
  let clean = rawUrl.replace(/^pmtiles:\/\//, '');

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return { key: clean, fetchUrl: clean };
  }

  // Ensure path starts with exactly one leading slash
  const path = '/' + clean.replace(/^\/+/, '');
  const fetchUrl = typeof window !== 'undefined'
    ? new URL(path, window.location.href).href
    : path;

  return { key: path, fetchUrl };
}

/**
 * Direct Origin Private File System (OPFS) source for zero-network, 100% offline PMTiles access.
 */
class OpfsSource implements pmtiles.Source {
  private fileName: string;
  private fileHandlePromise: Promise<FileSystemFileHandle | null> | null = null;
  private cachedFile: File | null = null;

  constructor(fileName: string) {
    this.fileName = fileName;
  }

  getKey(): string {
    return `opfs://${this.fileName}`;
  }

  private async getHandle(): Promise<FileSystemFileHandle | null> {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return null;
    if (!this.fileHandlePromise) {
      this.fileHandlePromise = (async () => {
        try {
          const root = await navigator.storage.getDirectory();
          return await root.getFileHandle(this.fileName);
        } catch {
          return null;
        }
      })();
    }
    return this.fileHandlePromise;
  }

  async isAvailable(): Promise<boolean> {
    const handle = await this.getHandle();
    if (!handle) return false;
    try {
      const file = await handle.getFile();
      return Boolean(file && file.size > 1000000);
    } catch {
      return false;
    }
  }

  async getBytes(offset: number, length: number): Promise<pmtiles.RangeResponse> {
    const handle = await this.getHandle();
    if (!handle) throw new Error(`OPFS file ${this.fileName} not available`);
    if (!this.cachedFile) {
      this.cachedFile = await handle.getFile();
    }
    const slice = this.cachedFile.slice(offset, offset + length);
    const data = await slice.arrayBuffer();
    return { data };
  }
}

/**
 * Custom PMTiles Fetch Source with in-memory buffer fallback.
 * Solves the issue where static servers or Service Workers return HTTP 200
 * instead of HTTP 206 (partial content) for Range requests.
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

      // If server returned 200 OK (ignored Range header and returned full file)
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
      if (err?.name === 'AbortError') throw err;
      console.warn(`Range request failed for ${this.url}, attempting full buffered archive fallback:`, err);
    }

    const fullBuffer = await this.fetchFullBuffer();
    const sliced = fullBuffer.slice(offset, offset + length);
    return { data: sliced };
  }
}

/**
 * Hybrid Source: tries local OPFS storage first for instantaneous offline responses,
 * falling back to RobustFetchSource (HTTP Range / buffered archive).
 */
class HybridSource implements pmtiles.Source {
  private key: string;
  private opfs: OpfsSource;
  private fetchSource: RobustFetchSource;
  private preferred: 'opfs' | 'fetch' | 'unknown' = 'unknown';

  constructor(key: string, url: string, opfsFileName: string) {
    this.key = key;
    this.opfs = new OpfsSource(opfsFileName);
    this.fetchSource = new RobustFetchSource(url);
  }

  getKey(): string {
    return this.key;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
    etag?: string
  ): Promise<pmtiles.RangeResponse> {
    if (this.preferred === 'opfs') {
      try {
        return await this.opfs.getBytes(offset, length);
      } catch (err) {
        console.warn('OPFS read failed, falling back to network fetch:', err);
        this.preferred = 'fetch';
      }
    }

    if (this.preferred === 'unknown') {
      const hasOpfs = await this.opfs.isAvailable();
      if (hasOpfs) {
        this.preferred = 'opfs';
        try {
          return await this.opfs.getBytes(offset, length);
        } catch (err) {
          console.warn('Initial OPFS read failed, falling back to fetch:', err);
          this.preferred = 'fetch';
        }
      } else {
        this.preferred = 'fetch';
      }
    }

    return await this.fetchSource.getBytes(offset, length, signal, etag);
  }
}

/**
 * Unified PMTiles & Offline Protocol manager for MapLibre GL JS.
 * Supports both `pmtiles://` and `offline-pmtiles://` with automatic fallbacks.
 */
class RobustPMTilesProtocol {
  private protocolInstance = new pmtiles.Protocol();
  private initialized = false;

  public init() {
    if (this.initialized || isProtocolRegistered) return;

    // 1. Register offline-pmtiles protocol from @makina-corpus/maplibre-offline-pmtiles
    try {
      OfflinePlugin.registerProtocol(maplibregl);
    } catch (err) {
      console.warn('OfflinePlugin registerProtocol notice:', err);
    }

    // 2. Setup Tuzla archive hybrid source (OPFS + HTTP Range fallback)
    const tuzlaPath = '/maps/tuzla.pmtiles';
    const tuzlaUrl = typeof window !== 'undefined'
      ? new URL(tuzlaPath, window.location.href).href
      : tuzlaPath;

    const tuzlaSource = new HybridSource(tuzlaPath, tuzlaUrl, 'tuzla.pmtiles');
    const tuzlaInstance = new pmtiles.PMTiles(tuzlaSource);

    // Pre-register for all common key variations
    this.protocolInstance.add(tuzlaInstance);
    const altKeys = ['maps/tuzla.pmtiles', tuzlaUrl, '/maps/tuzla.pmtiles', 'tuzla.pmtiles', 'tuzla'];
    for (const k of altKeys) {
      (this.protocolInstance as any).tiles.set(k, tuzlaInstance);
    }

    // 3. Register pmtiles protocol handler for MapLibre GL JS v4/v5
    maplibregl.addProtocol('pmtiles', async (params: any, abortController?: AbortController) => {
      const url: string = params.url || '';

      // TileJSON metadata request (e.g. "pmtiles:///maps/tuzla.pmtiles" or "pmtiles://maps/tuzla.pmtiles")
      if (params.type === 'json') {
        const { key, fetchUrl } = normalizePMTilesUrl(url);
        let instance = this.protocolInstance.get(key)
          || this.protocolInstance.get(key.replace(/^\//, ''))
          || this.protocolInstance.get('/' + key.replace(/^\//, ''));

        if (!instance) {
          const fallbackSource = new RobustFetchSource(fetchUrl);
          instance = new pmtiles.PMTiles(fallbackSource);
          this.protocolInstance.add(instance);
        }

        const header = await instance.getHeader();
        return {
          data: {
            tilejson: '3.0.0',
            scheme: 'xyz',
            tiles: [`pmtiles://${key.replace(/^\/+/, '/')}/{z}/{x}/{y}`],
            minzoom: header.minZoom,
            maxzoom: header.maxZoom,
            bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
          },
        };
      }

      // Tile request (e.g. "pmtiles:///maps/tuzla.pmtiles/14/9041/5923")
      const tileMatch = url.match(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
      if (tileMatch) {
        const rawPath = tileMatch[1];
        const z = parseInt(tileMatch[2], 10);
        const x = parseInt(tileMatch[3], 10);
        const y = parseInt(tileMatch[4], 10);

        const { key, fetchUrl } = normalizePMTilesUrl(rawPath);
        let instance = this.protocolInstance.get(key)
          || this.protocolInstance.get(key.replace(/^\//, ''))
          || this.protocolInstance.get('/' + key.replace(/^\//, ''));

        if (!instance) {
          const fallbackSource = new RobustFetchSource(fetchUrl);
          instance = new pmtiles.PMTiles(fallbackSource);
          this.protocolInstance.add(instance);
        }

        const resp = await instance.getZxy(z, x, y, abortController?.signal);
        if (resp && resp.data) {
          return {
            data: new Uint8Array(resp.data),
            cacheControl: resp.cacheControl,
            expires: resp.expires,
          };
        }
        return { data: new Uint8Array(0) };
      }

      // Delegate any unhandled requests to the official pmtiles protocol
      return this.protocolInstance.tilev4(params, abortController as any);
    });

    this.initialized = true;
    isProtocolRegistered = true;
    console.log('✅ Robust PMTiles & OPFS protocol initialized and registered for MapLibre');
  }
}

export const globalPMTilesProtocol = new RobustPMTilesProtocol();

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
