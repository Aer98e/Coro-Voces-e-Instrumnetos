import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages URL: https://aer98e.github.io/Coro-Voces-e-Instrumnetos/
  base: '/Coro-Voces-e-Instrumnetos/',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  }
})
