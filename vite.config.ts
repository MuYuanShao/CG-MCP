/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // Only the API base URL is public; the proxy key stays on the server.
    envPrefix: ['VITE_API_BASE_URL'],
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './app'),
      },
    },
    test: {
      include: ['app/**/*.test.{ts,tsx}', 'app/__tests__/**/*.test.{ts,tsx}'],
      exclude: ['tests/**', 'node_modules/**'],
      environment: 'jsdom',
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      fs: {
        deny: [
          '.env', '.env.*', '*.{crt,pem,key,p12,pfx}', '**/.git/**',
          '**/.claude/**', '**/.agents/**', '**/.playwright-cli/**', '**/logs/**',
          '**/test-results/**', '**/server/**',
        ],
      },
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
          headers: {
            'x-api-key': env.APP_API_KEY || env.VITE_API_KEY || '',
          },
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq, req) => {
              // The browser uses this server's /api proxy on both localhost and LAN IPs.
              // Keep cross-origin requests subject to the backend's existing CORS checks.
              if (req.headers.origin === `http://${req.headers.host}`) {
                proxyReq.removeHeader('origin')
              }
            })
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replaceAll('\\', '/');

            if (!normalizedId.includes('/node_modules/')) return undefined;

            if (
              normalizedId.includes('/node_modules/@radix-ui/') ||
              normalizedId.includes('/node_modules/cmdk/') ||
              normalizedId.includes('/node_modules/vaul/')
            ) {
              return 'vendor-ui';
            }

            if (
              normalizedId.includes('/node_modules/recharts/') ||
              normalizedId.includes('/node_modules/d3-') ||
              normalizedId.includes('/node_modules/victory-vendor/')
            ) {
              return 'vendor-charts';
            }

            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }

            if (
              normalizedId.includes('/node_modules/lucide-react/') ||
              normalizedId.includes('/node_modules/sonner/') ||
              normalizedId.includes('/node_modules/date-fns/')
            ) {
              return 'vendor-utils';
            }

            return undefined;
          },
        },
      },
    },
  }
})
