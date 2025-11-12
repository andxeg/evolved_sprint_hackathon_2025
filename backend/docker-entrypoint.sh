#!/bin/bash

# Ensure output directories exist (this will work even if parent dirs are read-only)
mkdir -p /app/tmp/output/results/uploads 2>/dev/null || true
mkdir -p /app/tmp/output/results/checks 2>/dev/null || true

# Try to set permissions if we have write access
# This will fail silently if we don't have permissions, which is OK
# The host directory permissions need to be set correctly on the host
chmod -R 755 /app/tmp/output/results 2>/dev/null || true

# Execute the main command
exec "$@"

