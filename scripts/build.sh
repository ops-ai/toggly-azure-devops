#!/bin/bash
set -e

echo "================================"
echo "Building Toggly Azure DevOps Extension"
echo "================================"

# Clean previous builds
echo ""
echo "Cleaning previous builds..."
npm run clean

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Build TypeScript
echo ""
echo "Building TypeScript..."
npm run build

# Webpack tasks
echo ""
echo "Bundling tasks with Webpack..."
npm run webpack

echo ""
echo "✓ Build completed successfully!"
echo ""
echo "Next steps:"
echo "  - Run 'npm run package' to create VSIX package"
echo "  - Run 'npm run publish' to publish to marketplace"

