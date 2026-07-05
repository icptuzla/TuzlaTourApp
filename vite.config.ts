import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type { UserConfig, ConfigEnv } from 'vite';

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: true,
      watch: {
        ignored: ['**/rollup/**', '**/rollup/test/**'],
      },
      fs: {
        deny: ['rollup'],
      },
    },
    plugins: [
      basicSsl(),
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ['buffer', 'process', 'crypto', 'stream', 'util', 'events', 'vm'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      VitePWA({
        strategies: 'generateSW',
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module'
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'Tuzla Virtual Tour Guide',
          short_name: 'Tuzla Guide',
          description: 'Explore Tuzla with interactive maps, quests, and local history.',
          theme_color: '#1e40af',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'assets/Gallery/QuestQRLocations/TuzlaMenuLogo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'assets/Gallery/QuestQRLocations/TuzlaMenuLogo.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'assets/Gallery/QuestQRLocations/TuzlaMenuLogo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globDirectory: 'dist',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB limit
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
    },
    build: {
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (
            warning.code === 'INVALID_ANNOTATION' &&
            warning.message.includes('Rollup cannot interpret due to the position of the comment')
          ) {
            return;
          }
          defaultHandler(warning);
        },
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['framer-motion', 'lucide-react'],
            'vendor-map': ['maplibre-gl'],
            'vendor-qr': ['html5-qrcode'],
            'vendor-query': ['@tanstack/react-query']
          }
        },
      },
      chunkSizeWarningLimit: 2000,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'framer-motion',
        'lucide-react',
        'maplibre-gl',
        'html5-qrcode',
        '@tanstack/react-query',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui',
        '@solana/wallet-adapter-wallets',
        '@solana/web3.js'
      ],
      exclude: ['rollup'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
