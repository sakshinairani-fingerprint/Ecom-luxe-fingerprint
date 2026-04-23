#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║        LUXE Ecommerce — Dev Start        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Start PostgreSQL via Docker
echo "▶  Starting PostgreSQL via Docker Compose..."
docker compose -f "$ROOT/docker-compose.yml" up -d postgres

echo "⏳  Waiting for Postgres to be ready..."
until docker exec ecom_postgres pg_isready -U postgres -q 2>/dev/null; do
  sleep 1
done
echo "✅  PostgreSQL is ready."
echo ""

# 2. Start backend
echo "▶  Starting backend (port 3001)..."
cd "$ROOT/backend"
node --watch server.js &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo ""

# 3. Start frontend
echo "▶  Starting frontend (port 5173)..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Frontend  →  http://localhost:5173"
echo "  Backend   →  http://localhost:3001"
echo "  pgAdmin   →  http://localhost:5050"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Wait and cleanup on Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose -f '$ROOT/docker-compose.yml' stop postgres; exit 0" SIGINT SIGTERM

wait
