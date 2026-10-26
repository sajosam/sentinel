#!/usr/bin/env bash
set -e

echo "=== Setting up SentinelOS ==="

# 1. Setup Python Virtual Environment
echo "Setting up Python 3.12 virtual environment..."
python3.12 -m venv backend/.venv || python3 -m venv backend/.venv
backend/.venv/bin/pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt

# 2. Setup Frontend
echo "Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

# 3. Setup Demo Lab
echo "Initializing SentinelOS Security Lab demo target..."
backend/.venv/bin/python demo_lab/reset.py

echo "=== SentinelOS Setup Complete ==="
