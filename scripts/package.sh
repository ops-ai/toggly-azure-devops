#!/bin/bash
set -e

echo "================================"
echo "Packaging Toggly Azure DevOps Extension"
echo "================================"

# Build first
echo ""
echo "Building extension..."
./scripts/build.sh

STAGE="package"
REQUIRED_TASKS=(
  CreateReleaseTask
  AssociateBuildTask
  CreateFeatureTask
  UpdateFeatureTask
  UpdateFeatureEnvTask
  ActivateReleaseTask
  RollbackReleaseTask
  TogglyCLI
)

echo ""
echo "Staging tasks into ./$STAGE ..."
rm -rf "$STAGE"
mkdir -p "$STAGE/tasks" "$STAGE/images"

# Discover every task that has a task.json under extension/tasks
while IFS= read -r task_json; do
  TASK="$(basename "$(dirname "$task_json")")"
  echo "  Staging $TASK"
  mkdir -p "$STAGE/tasks/$TASK"

  if [[ ! -f "dist/tasks/$TASK/index.js" ]]; then
    echo "ERROR: missing webpack output dist/tasks/$TASK/index.js" >&2
    exit 1
  fi

  cp "dist/tasks/$TASK/index.js" "$STAGE/tasks/$TASK/index.js"
  cp "extension/tasks/$TASK/task.json" "$STAGE/tasks/$TASK/"
  cp "extension/tasks/$TASK/package.json" "$STAGE/tasks/$TASK/"

  if [[ "$TASK" == "TogglyCLI" ]]; then
    cp "extension/tasks/$TASK/toggly_action.py" "$STAGE/tasks/$TASK/"
    cp "extension/tasks/$TASK/toggly_action.py.sha256" "$STAGE/tasks/$TASK/"
  fi

  echo "    Installing task runtime dependencies..."
  (
    cd "$STAGE/tasks/$TASK"
    npm install --omit=dev --no-package-lock
  )
done < <(find extension/tasks -mindepth 2 -maxdepth 2 -name task.json | sort)

cp "extension/overview.md" "$STAGE/overview.md"
cp "extension/vss-extension.json" "$STAGE/vss-extension.json"
cp "extension/images/extension-icon.png" "$STAGE/images/"

# Guard: stage must contain all seven historical tasks and TogglyCLI
MISSING=0
for TASK in "${REQUIRED_TASKS[@]}"; do
  if [[ ! -f "$STAGE/tasks/$TASK/task.json" ]] || [[ ! -f "$STAGE/tasks/$TASK/index.js" ]]; then
    echo "ERROR: package stage missing required task: $TASK" >&2
    MISSING=1
  fi
done
if [[ "$MISSING" -ne 0 ]]; then
  exit 1
fi

if [[ ! -f "$STAGE/tasks/TogglyCLI/toggly_action.py" ]] || [[ ! -f "$STAGE/tasks/TogglyCLI/toggly_action.py.sha256" ]]; then
  echo "ERROR: TogglyCLI extras (toggly_action.py / sha256) missing from package stage" >&2
  exit 1
fi

# Confirm service-endpoint contribution is present in the staged manifest
if ! grep -q 'toggly-service-endpoint' "$STAGE/vss-extension.json"; then
  echo "ERROR: staged manifest is missing toggly-service-endpoint contribution" >&2
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
