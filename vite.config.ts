/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
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
    hmr: {
      host: '127.0.0.1',
      port: 5173,
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        headers: {
          'x-api-key': process.env.VITE_API_KEY || '',
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
})
