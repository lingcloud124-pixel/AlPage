#!/bin/bash
set -e
cd "$(dirname "$0")/.."

npx vite --port 5180 &
VITE_PID=$!

cleanup() {
  kill $VITE_PID 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 15); do
  if curl -s -o /dev/null http://localhost:5180 2>/dev/null; then
    echo "Vite ready on :5180"
    break
  fi
  sleep 1
done

npx tsx ./scripts/build.ts "$@"
