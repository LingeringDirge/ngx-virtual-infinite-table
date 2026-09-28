#!/usr/bin/env bash
set -e

# Deployment script for GitHub Pages
echo "Building demo for GitHub Pages..."
npm run build -- --output-path dist/demo --base-href /ngx-virtual-infinite-table/

if ! command -v npx &> /dev/null; then
    echo "npx could not be found. Please ensure Node.js and npm are installed."
    exit 1
fi

echo "Publishing to gh-pages branch..."
npx angular-cli-ghpages --dir=dist/demo

echo "Deployed successfully to GitHub Pages!"
