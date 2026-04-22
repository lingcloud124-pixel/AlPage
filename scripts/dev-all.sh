#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS=()

start_service() {
  local name="$1"
  local workdir="$2"
  shift 2

  (
    cd "$workdir"
    echo "[${name}] starting in ${workdir}"
    exec "$@"
  ) &

  PIDS+=("$!")
}

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM

  if ((${#PIDS[@]} > 0)); then
    echo
    echo "Stopping Theme Studio dev services..."
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

echo "Starting Theme Studio dev services..."
echo "  API:           http://127.0.0.1:3001"
echo "  Web:           http://127.0.0.1:5173"
echo "  Export Bridge: http://127.0.0.1:5174"
echo

start_service "server" "${ROOT_DIR}/server" npm run dev
start_service "web" "${ROOT_DIR}/web" npm run dev -- --host 127.0.0.1
start_service "bridge" "${ROOT_DIR}/web" npm run export-bridge

wait -n "${PIDS[@]}"
