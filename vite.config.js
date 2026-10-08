// Vite configuration. Before Docker we didn't need this file — Vite's defaults were fine.
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // By default Vite only listens on "localhost" — which, inside a container,
    // means the container itself. 0.0.0.0 = listen on all network interfaces,
    // so Docker's port forwarding from your machine can reach it.
    host: '0.0.0.0',
    port: 5173,
    // Fail loudly instead of silently picking another port (Docker only forwards 5173).
    strictPort: true,
  },
})
