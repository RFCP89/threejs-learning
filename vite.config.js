// Vite configuration.
import { defineConfig } from 'vite'

export default defineConfig({
  // Step 12: base './' makes every link in the built site RELATIVE ("./assets/x.js"
  // instead of "/assets/x.js"). Then the site works from any folder — e.g. GitHub Pages
  // serves it at https://<user>.github.io/threejs-learning/, not at the domain root.
  base: './',

  server: {
    // By default Vite only listens on "localhost" — which, inside a container,
    // means the container itself. 0.0.0.0 = listen on all network interfaces,
    // so Docker's port forwarding from your machine can reach it.
    host: '0.0.0.0',
    port: 5173,
    // Fail loudly instead of silently picking another port (Docker only forwards 5173).
    strictPort: true,
  },

  build: {
    // three.js alone is ~700 kB (≈180 kB gzipped). Vite warns above 500 kB to nudge
    // people towards code-splitting; for a single 3D scene, one bundle is fine.
    chunkSizeWarningLimit: 1000,
  },
})
