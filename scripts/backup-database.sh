#!/usr/bin/env bash
# ==============================================================================
# APEX INN PMS — Self-Controlled Database Backup Tool
# Exports 100% of your PostgreSQL database to a compressed SQL snapshot.
# ==============================================================================

set -e

BACKUP_DIR="./backups/sql"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="$BACKUP_DIR/apex_inn_backup_$TIMESTAMP.sql.gz"

# Load DATABASE_URL from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres123@localhost:5432/apex_inn_pms}"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DB_URL" --clean --if-exists --no-owner --no-privileges | gzip > "$FILENAME"
elif docker ps --format '{{.Names}}' | grep -q 'apex_inn_postgres'; then
  docker exec -i apex_inn_postgres pg_dump -U postgres apex_inn_pms --clean --if-exists --no-owner --no-privileges | gzip > "$FILENAME"
else
  echo "❌ Error: Neither pg_dump nor apex_inn_postgres docker container found."
  exit 1
fi

FILESIZE=$(ls -lh "$FILENAME" | awk '{print $5}')
echo "✅ Full database backup created successfully!"
echo "📁 File: $FILENAME ($FILESIZE)"
echo "🔒 Stored locally under your direct ownership."
