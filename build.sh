#!/bin/sh
set -eu

# VCR's Node build image installs production dependencies by default, but the
# Vite/TypeScript toolchain is intentionally kept in devDependencies.
npm install --include=dev --ignore-scripts
npm run build
