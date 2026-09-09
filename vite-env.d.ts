/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GEOCODING_API_KEY: string;

  readonly VITE_VERCEL_BLOB_HERO_WEB?: string;
  readonly VITE_GEOAPIFY_ROUTING_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
    readonly GEMINI_API_KEY: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};

declare namespace JSX {
  interface IntrinsicElements {
    'a-scene': any;
    'a-assets': any;
    'a-entity': any;
    'a-sky': any;
    'a-camera': any;
    'a-cursor': any;
    'a-image': any;
    'a-text': any;
    'a-box': any;
    'a-sphere': any;
    'a-cylinder': any;
    'a-plane': any;
    'a-cone': any;
    'a-light': any;
    'a-video': any;
    'a-videosphere': any;
    'a-asset-item': any;
    'a-mixin': any;
    'a-link': any;
  }
}
