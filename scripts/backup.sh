#!/usr/bin/env bash
# Backup critical project data: SQLite DB, DOCX templates, .env
# Usage: bash scripts/backup.sh [--docker]
# Output: backups/backup-YYYY-MM-DD_HH-MM.tar.gz

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="$ROOT/backups/$TIMESTAMP"
ARCHIVE="$ROOT/backups/backup-$TIMESTAMP.tar.gz"

DOCKER_MODE=false
for arg in "$@"; do
  case "$arg" in
    --docker) DOCKER_MODE=true ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

mkdir -p "$BACKUP_DIR"

# --- 1. SQLite Database ---
echo "[backup] SQLite database..."
if $DOCKER_MODE; then
  # Export from Docker volume
  docker run --rm -v report-db:/data -v "$BACKUP_DIR":/backup alpine \
    cp /data/report.db /backup/report.db 2>/dev/null \
    || echo "  [warn] Docker volume 'report-db' not found or empty"
else
  DB_PATH="$ROOT/services/report-service/report.db"
  if [ -f "$DB_PATH" ]; then
    # Use sqlite3 .backup for consistency (safe even if DB is open)
    if command -v sqlite3 &>/dev/null; then
      sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/report.db'"
    else
      cp "$DB_PATH" "$BACKUP_DIR/report.db"
    fi
    echo "  [ok] report.db ($(du -h "$BACKUP_DIR/report.db" | cut -f1))"
  else
    echo "  [warn] report.db not found at $DB_PATH"
  fi
fi

# --- 2. DOCX Templates ---
echo "[backup] DOCX templates..."
if $DOCKER_MODE; then
  CONTAINER=$(docker compose ps -q export-service 2>/dev/null)
  if [ -n "$CONTAINER" ]; then
    docker cp "$CONTAINER":/app/templates "$BACKUP_DIR/templates"
    COUNT=$(find "$BACKUP_DIR/templates" -name "*.docx" | wc -l)
    echo "  [ok] $COUNT template files (from container)"
  else
    echo "  [warn] export-service container not running, trying local files..."
    TEMPLATES_DIR="$ROOT/services/export-service/templates"
    if [ -d "$TEMPLATES_DIR" ]; then
      cp -r "$TEMPLATES_DIR" "$BACKUP_DIR/templates"
      COUNT=$(find "$BACKUP_DIR/templates" -name "*.docx" | wc -l)
      echo "  [ok] $COUNT template files (local)"
    else
      echo "  [warn] templates not found"
    fi
  fi
else
  TEMPLATES_DIR="$ROOT/services/export-service/templates"
  if [ -d "$TEMPLATES_DIR" ]; then
    cp -r "$TEMPLATES_DIR" "$BACKUP_DIR/templates"
    COUNT=$(find "$BACKUP_DIR/templates" -name "*.docx" | wc -l)
    echo "  [ok] $COUNT template files"
  else
    echo "  [warn] templates dir not found at $TEMPLATES_DIR"
  fi
fi

# --- 3. Environment config ---
echo "[backup] .env..."
if [ -f "$ROOT/.env" ]; then
  cp "$ROOT/.env" "$BACKUP_DIR/.env"
  echo "  [ok] .env"
else
  echo "  [skip] .env not found"
fi

# --- 4. Pack archive ---
echo "[backup] Creating archive..."
tar -czf "$ARCHIVE" -C "$ROOT/backups" "$TIMESTAMP"
rm -rf "$BACKUP_DIR"

# Checksum
SHA=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
SIZE=$(du -h "$ARCHIVE" | cut -f1)

echo ""
echo "Backup complete:"
echo "  File:   $ARCHIVE"
echo "  Size:   $SIZE"
echo "  SHA256: $SHA"
