#!/bin/sh
# Runs the visual suite inside the official Playwright Linux image, so screenshots match CI exactly.
# The container joins the network namespace of the shop-sut backend container: http://localhost:8000
# and :9000 mean the same thing inside it as on the host. No host networking (works on macOS).
# Usage: scripts/visual-docker.sh [extra playwright args, e.g. --update-snapshots]
set -eu

SUT_DIR=${SUT_DIR:-../shop-sut}
PW_VERSION=$(node -p "require('./node_modules/@playwright/test/package.json').version")
MEDUSA=$(docker compose -f "$SUT_DIR/compose.yaml" ps -q medusa)
if [ -z "$MEDUSA" ]; then
  echo "visual-docker: shop-sut is not running (make -C $SUT_DIR up)" >&2
  exit 2
fi
# Git Bash on Windows needs a Windows-style path for bind mounts; elsewhere pwd is fine.
abs() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }

docker run --rm --ipc=host --network "container:$MEDUSA" \
  -v "$(abs .):/work" \
  -v qa-e2e-linux-node-modules:/work/node_modules \
  -v "$(abs "$SUT_DIR/.generated"):/sut:ro" \
  -e SUT_ENV_FILE=/sut/sut.env -e HUSKY=0 -e CI= -e PW_VISUAL=1 \
  -w /work "mcr.microsoft.com/playwright:v${PW_VERSION}-noble" \
  sh -c "npm ci --no-audit --no-fund --loglevel=error && npx playwright test --project=visual $*"
