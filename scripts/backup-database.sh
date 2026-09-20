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

echo "📦 Creating self-controlled database backup from: $DB_URL"
pg_dump "$DB_URL" --clean --if-exists --no-owner --no-privileges | gzip > "$FILENAME"

FILESIZE=$(ls -lh "$FILENAME" | awk '{print $5}')
echo "✅ Full database backup created successfully!"
echo "📁 File: $FILENAME ($FILESIZE)"
echo "🔒 Stored locally under your direct ownership."
