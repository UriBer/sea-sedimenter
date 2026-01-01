#!/bin/bash

# Setup script for trusted local HTTPS certificates using mkcert
# This makes Firefox work with local development

set -e

echo "Setting up trusted local HTTPS certificates..."

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "mkcert is not installed."
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install mkcert"
    echo "  Windows: choco install mkcert"
    echo "  Linux:   apt install mkcert"
    exit 1
fi

# Install local CA
echo "Installing local CA..."
mkcert -install

# Generate certificates
echo "Generating certificates for localhost..."
mkcert localhost 127.0.0.1 ::1

# Move certificates to project root
mv localhost+2.pem cert.pem
mv localhost+2-key.pem cert-key.pem

echo ""
echo "✅ Certificates generated!"
echo ""
echo "Update vite.config.ts to use these certificates:"
echo ""
echo "import { defineConfig } from 'vite';"
echo "import fs from 'fs';"
echo ""
echo "export default defineConfig({"
echo "  server: {"
echo "    https: {"
echo "      key: fs.readFileSync('./cert-key.pem'),"
echo "      cert: fs.readFileSync('./cert.pem'),"
echo "    },"
echo "    host: true,"
echo "    port: 5173"
echo "  },"
echo "  build: {"
echo "    outDir: 'dist',"
echo "    sourcemap: true"
echo "  }"
echo "});"
echo ""
echo "Add to .gitignore:"
echo "  cert.pem"
echo "  cert-key.pem"

