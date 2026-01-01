import { defineConfig } from 'vite';

// Allow HTTP for local development (sensors won't work, but app will load)
// Set VITE_HTTPS=true for HTTPS (required for device sensors)
const useHTTPS = process.env.VITE_HTTPS !== 'false';

export default defineConfig({
  server: {
    https: useHTTPS ? true : false,
    host: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});

