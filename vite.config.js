import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,         // Allows access from outside the container
    port: 8309,         // Matches your requested port
    strictPort: true,   // Fails if the port is taken (prevents auto-switching to 5173)
    watch: {
      usePolling: true, // Required for hot-reload to work on Windows Docker
      interval: 100,
    },
  },
})