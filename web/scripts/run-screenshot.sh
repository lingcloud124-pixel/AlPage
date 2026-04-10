#!/bin/bash
set -e
cd "$(dirname "$0")/.."

# Start vite in background
npx vite --port 5180 &
VITE_PID=$!

cleanup() {
  kill $VITE_PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait for vite to be ready
for i in $(seq 1 15); do
  if curl -s -o /dev/null http://localhost:5180 2>/dev/null; then
    echo "Vite ready on :5180"
    break
  fi
  sleep 1
done

# Run screenshot
OUTPUT_DIR="${1:-./test-screenshots}"
echo "Capturing screenshots to: $OUTPUT_DIR"
npx tsx ./scripts/screenshot.ts "$OUTPUT_DIR"
