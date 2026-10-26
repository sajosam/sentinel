#!/usr/bin/env bash
set -e

echo "=== Starting SentinelOS Platform ==="

# Trap to kill background jobs on CTRL+C
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

# 1. Start Backend on 8000
echo "Starting SentinelOS Local Security Service on http://127.0.0.1:8000..."
backend/.venv/bin/python backend/run.py &
BACKEND_PID=$!

# Wait for backend to be healthy
sleep 2

# 2. Start Frontend on 5173
echo "Starting SentinelOS Desktop Dashboard on http://127.0.0.1:5173..."
cd frontend
npm run dev -- --host 127.0.0.1 &
FRONTEND_PID=$!
cd ..

echo "=== SentinelOS is Running ==="
echo "Dashboard: http://127.0.0.1:5173"
echo "Backend API: http://127.0.0.1:8000"
echo "Press Ctrl+C to stop all services."

wait
