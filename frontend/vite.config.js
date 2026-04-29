import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const vendorChunkGroups = {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'ui-vendor': ['framer-motion', 'lucide-react'],
  'query-vendor': ['@tanstack/react-query', 'axios'],
  'map-vendor': ['leaflet', 'react-leaflet'],
  'form-vendor': ['react-hook-form', 'zod'],
  'i18n-vendor': ['i18next', 'react-i18next'],
  'date-vendor': ['date-fns'],
}

const resolveChunkName = (moduleId) => {
  if (!moduleId.includes('node_modules')) {
    return undefined
  }

  const normalizedId = moduleId.replace(/\\/g, '/')

  for (const [chunkName, packages] of Object.entries(vendorChunkGroups)) {
    const hasPackage = packages.some((pkg) => normalizedId.includes(`/node_modules/${pkg}/`))
    if (hasPackage) {
      return chunkName
    }
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: resolveChunkName,
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    css: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}', 'tests/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
})
