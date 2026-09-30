#!/bin/bash
set -e

echo "================================"
echo "Packaging Toggly Azure DevOps Extension"
echo "================================"

# Build first
echo ""
echo "Building extension..."
./scripts/build.sh

TASK="TogglyCLI"
STAGE="package"

echo ""
echo "Staging $TASK into ./$STAGE ..."
rm -rf "$STAGE"
mkdir -p "$STAGE/tasks/$TASK" "$STAGE/images"

cp "dist/tasks/$TASK/index.js" "$STAGE/tasks/$TASK/index.js"
cp "extension/tasks/$TASK/task.json" "$STAGE/tasks/$TASK/"
cp "extension/tasks/$TASK/package.json" "$STAGE/tasks/$TASK/"
cp "extension/tasks/$TASK/toggly_action.py" "$STAGE/tasks/$TASK/"
cp "extension/tasks/$TASK/toggly_action.py.sha256" "$STAGE/tasks/$TASK/"
cp "extension/overview.md" "$STAGE/overview.md"
cp "extension/vss-extension.json" "$STAGE/vss-extension.json"
cp "extension/images/extension-icon.png" "$STAGE/images/"

echo "  Installing task runtime dependencies..."
(
  cd "$STAGE/tasks/$TASK"
  npm install --omit=dev --no-package-lock
)

# Guard: packaged tree must not include retired tasks or the service endpoint
if find "$STAGE" -iname '*CreateRelease*' -o -iname '*ActivateRelease*' -o -iname '*service-endpoint*' | grep -q .; then
  echo "ERROR: package stage contains retired task or service-endpoint paths" >&2
  exit 1
fi

mkdir -p output

echo ""
echo "Creating VSIX package..."
(
  cd "$STAGE"
  tfx extension create --manifest-globs vss-extension.json --output-path ../output
)

VSIX_FILE=$(ls output/*.vsix | head -n 1)

echo ""
echo "✓ Extension packaged successfully!"
echo ""
echo "Package: $VSIX_FILE"
echo ""
echo "Next steps:"
echo "  - Test locally by uploading to Azure DevOps"
echo "  - Marketplace publish is a human follow-up (do not run tfx publish from agents)"
