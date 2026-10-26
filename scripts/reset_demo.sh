#!/usr/bin/env bash
set -e

echo "=== Resetting SentinelOS Security Lab ==="
backend/.venv/bin/python demo_lab/reset.py
echo "Demo Lab has been restored to its initial vulnerable state."
