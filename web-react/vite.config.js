import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Siempre en 5173 (el único origen permitido por CORS en Spring y Django).
  // Si está ocupado, Vite falla con un error claro en vez de saltar al 5174.
  server: {
    port: 5173,
    strictPort: true,
  },
})
