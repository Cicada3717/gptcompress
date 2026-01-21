import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../App',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'widget-react.js',
        assetFileNames: 'widget-react.[ext]',
      },
    },
  },
})
