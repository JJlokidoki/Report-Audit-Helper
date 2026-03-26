#!/usr/bin/env bash
# Start/restart development services (without Docker)
# Usage: bash scripts/start.sh [--all|--frontend|--report|--export|--ai|--archive]
# Default: --all

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

kill_port() {
  local port=$1
  local pid
  pid=$(netstat -ano 2>/dev/null | grep ":${port} " | grep LISTEN | awk '{print $5}' | head -1)
  if [ -n "$pid" ] && [ "$pid" != "0" ]; then
    echo "  [kill] port $port (PID $pid)"
    taskkill //F //PID "$pid" >/dev/null 2>&1 || true
    sleep 1
  fi
}

start_backend() {
  local name=$1 port=$2 dir=$3
  echo "$name (port $port):"
  kill_port "$port"
  cd "$ROOT/$dir"
  source venv/Scripts/activate
  uvicorn app.main:app --host 127.0.0.1 --port "$port" --reload &
  echo "  [started] PID $!"
  cd "$ROOT"
}

start_frontend() {
  echo "frontend (port 5173):"
  kill_port 5173
  cd "$ROOT/frontend"
  npm run dev &
  echo "  [started] PID $!"
  cd "$ROOT"
}

wait_ready() {
  local port=$1 name=$2 tries=0
  while ! curl -s -o /dev/null "http://localhost:$port" 2>/dev/null; do
    tries=$((tries + 1))
    if [ $tries -ge 30 ]; then
      echo "  [warn] $name on port $port not responding after 15s"
      return
    fi
    sleep 0.5
  done
  echo "  [ready] $name on port $port"
}

# Parse args
DO_ALL=false DO_FRONTEND=false DO_REPORT=false DO_EXPORT=false DO_AI=false DO_ARCHIVE=false DO_BZONE=false
if [ $# -eq 0 ]; then DO_ALL=true; fi
for arg in "$@"; do
  case "$arg" in
    --all)      DO_ALL=true ;;
    --frontend) DO_FRONTEND=true ;;
    --report)   DO_REPORT=true ;;
    --export)   DO_EXPORT=true ;;
    --ai)       DO_AI=true ;;
    --archive)  DO_ARCHIVE=true ;;
    --bzone)    DO_BZONE=true ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

# Load .env if present
if [ -f "$ROOT/.env" ]; then
  set -a; source "$ROOT/.env"; set +a
fi

if $DO_ALL || $DO_REPORT; then
  start_backend "report-service" 8001 "services/report-service"
fi
if $DO_ALL || $DO_EXPORT; then
  start_backend "export-service" 8002 "services/export-service"
fi
if $DO_ALL || $DO_AI; then
  start_backend "ai-vuln-generator" 8004 "services/ai-vuln-generator"
fi
if $DO_ALL || $DO_ARCHIVE; then
  start_backend "archive" 8006 "services/archive"
fi
if $DO_ALL || $DO_BZONE; then
  start_backend "bzone-service" 8007 "services/bzone-service"
fi
if $DO_ALL || $DO_FRONTEND; then
  start_frontend
fi

echo ""
echo "Waiting for services..."

if $DO_ALL || $DO_REPORT;   then wait_ready 8001 "report-service"; fi
if $DO_ALL || $DO_EXPORT;   then wait_ready 8002 "export-service"; fi
if $DO_ALL || $DO_AI;       then wait_ready 8004 "ai-vuln-generator"; fi
if $DO_ALL || $DO_ARCHIVE;  then wait_ready 8006 "archive"; fi
if $DO_ALL || $DO_BZONE;    then wait_ready 8007 "bzone-service"; fi
if $DO_ALL || $DO_FRONTEND; then wait_ready 5173 "frontend"; fi

echo ""
echo "All done. Press Ctrl+C to stop."
wait
