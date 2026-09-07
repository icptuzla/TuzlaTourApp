import maplibregl from 'maplibre-gl';
import * as pmtiles from 'pmtiles';

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
        // Cache the buffer for subsequent requests
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

    // Fallback: use sliced buffer from full file
    const fullBuffer = await this.fetchFullBuffer();
    const sliced = fullBuffer.slice(offset, offset + length);
    return { data: sliced };
  }
}

class RobustPMTilesProtocol {
  private tilesMap = new Map<string, pmtiles.PMTiles>();
  private isRegistered = false;

  public init() {
    if (this.isRegistered) return;

    const protocol = new pmtiles.Protocol();

    const customTileHandler = (
      params: maplibregl.RequestParameters,
      abortController: AbortController
    ): Promise<maplibregl.ResponseCallback<ArrayBuffer | object> | any> => {
      // Check if it's a tileJSON request or a vector tile request
      if (params.type === 'json') {
        const rawUrl = params.url.replace(/^pmtiles:\/\//, '');
        let instance = this.tilesMap.get(rawUrl);
        if (!instance) {
          const source = new RobustFetchSource(rawUrl);
          instance = new pmtiles.PMTiles(source);
          this.tilesMap.set(rawUrl, instance);
          protocol.add(instance);
        }
        return instance.getHeader().then((header) => {
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
        });
      }

      // Tile request
      const tileMatch = params.url.match(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/);
      if (!tileMatch) {
        return protocol.tilev4(params, abortController);
      }

      const rawUrl = tileMatch[1];
      const z = parseInt(tileMatch[2], 10);
      const x = parseInt(tileMatch[3], 10);
      const y = parseInt(tileMatch[4], 10);

      let instance = this.tilesMap.get(rawUrl);
      if (!instance) {
        const source = new RobustFetchSource(rawUrl);
        instance = new pmtiles.PMTiles(source);
        this.tilesMap.set(rawUrl, instance);
        protocol.add(instance);
      }

      return instance.getZxy(z, x, y, abortController.signal).then((resp) => {
        if (resp && resp.data) {
          return {
            data: new Uint8Array(resp.data),
            cacheControl: resp.cacheControl,
            expires: resp.expires,
          };
        }
        return { data: new Uint8Array(0) };
      });
    };

    maplibregl.addProtocol('pmtiles', (params, callback) => {
      const abortController = new AbortController();
      customTileHandler(params, abortController)
        .then((res) => callback(undefined, res.data, res.cacheControl, res.expires))
        .catch((err) => callback(err));
      return { cancel: () => abortController.abort() };
    });

    this.isRegistered = true;
  }
}

export const globalPMTilesProtocol = new RobustPMTilesProtocol();
