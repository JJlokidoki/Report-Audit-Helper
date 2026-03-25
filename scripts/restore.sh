#!/usr/bin/env bash
# Restore project data from backup archive
# Usage: bash scripts/restore.sh <backup-archive.tar.gz> [--docker]

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$1" ] || [ ! -f "$1" ]; then
  echo "Usage: bash scripts/restore.sh <backup-archive.tar.gz> [--docker]"
  echo ""
  echo "Available backups:"
  ls -1t "$ROOT/backups/"*.tar.gz 2>/dev/null || echo "  (none)"
  exit 1
fi

ARCHIVE="$1"
DOCKER_MODE=false
for arg in "${@:2}"; do
  case "$arg" in
    --docker) DOCKER_MODE=true ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

# Verify checksum
echo "[restore] Archive: $ARCHIVE"
SHA=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
echo "  SHA256: $SHA"

# Extract
TEMP_DIR=$(mktemp -d)
tar -xzf "$ARCHIVE" -C "$TEMP_DIR"
EXTRACTED=$(ls "$TEMP_DIR")
DATA_DIR="$TEMP_DIR/$EXTRACTED"

# --- 1. SQLite Database ---
echo "[restore] SQLite database..."
if [ -f "$DATA_DIR/report.db" ]; then
  if $DOCKER_MODE; then
    docker run --rm -v report-db:/data -v "$DATA_DIR":/backup alpine \
      cp /backup/report.db /data/report.db
  else
    TARGET="$ROOT/services/report-service/report.db"
    if [ -f "$TARGET" ]; then
      cp "$TARGET" "$TARGET.bak"
      echo "  [info] existing DB backed up to report.db.bak"
    fi
    cp "$DATA_DIR/report.db" "$TARGET"
  fi
  echo "  [ok] report.db restored"
else
  echo "  [skip] report.db not in archive"
fi

# --- 2. DOCX Templates ---
echo "[restore] DOCX templates..."
if [ -d "$DATA_DIR/templates" ]; then
  if $DOCKER_MODE; then
    # Copy to local dir first — Docker will pick up on rebuild
    TARGET="$ROOT/services/export-service/templates"
    cp -r "$DATA_DIR/templates/"* "$TARGET/"
    # Also copy into running container if available
    CONTAINER=$(docker compose ps -q export-service 2>/dev/null)
    if [ -n "$CONTAINER" ]; then
      docker cp "$DATA_DIR/templates/." "$CONTAINER":/app/templates/
      echo "  [ok] templates restored (container + local)"
    else
      echo "  [ok] templates restored (local — rebuild container to apply)"
    fi
  else
    TARGET="$ROOT/services/export-service/templates"
    cp -r "$DATA_DIR/templates/"* "$TARGET/"
    COUNT=$(find "$TARGET" -name "*.docx" | wc -l)
    echo "  [ok] $COUNT template files restored"
  fi
else
  echo "  [skip] templates not in archive"
fi

# --- 3. Environment config ---
echo "[restore] .env..."
if [ -f "$DATA_DIR/.env" ]; then
  if [ -f "$ROOT/.env" ]; then
    cp "$ROOT/.env" "$ROOT/.env.bak"
    echo "  [info] existing .env backed up to .env.bak"
  fi
  cp "$DATA_DIR/.env" "$ROOT/.env"
  echo "  [ok] .env restored"
else
  echo "  [skip] .env not in archive"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "Restore complete. Start services to verify:"
if $DOCKER_MODE; then
  echo "  docker compose up --build -d"
else
  echo "  bash scripts/start.sh"
fi
