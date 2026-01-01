import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Try to use mkcert certificates if they exist, otherwise use default
let httpsConfig: boolean | { key: Buffer; cert: Buffer } = true;

const certPath = path.resolve(__dirname, 'cert.pem');
const keyPath = path.resolve(__dirname, 'cert-key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsConfig = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  console.log('Using mkcert certificates for HTTPS');
} else {
  console.log('Using default Vite self-signed certificate (may not work in Firefox)');
}

export default defineConfig({
  server: {
    https: httpsConfig,
    host: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});

