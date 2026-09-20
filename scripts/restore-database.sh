#!/usr/bin/env bash
# ==============================================================================
# APEX INN PMS — Self-Controlled Database Restore Tool
# Restores a compressed SQL snapshot into your PostgreSQL database.
# ==============================================================================

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore-database.sh <path_to_backup_file.sql.gz>"
  echo "Example: ./scripts/restore-database.sh ./backups/sql/apex_inn_backup_2026-09-20.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load DATABASE_URL from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres123@localhost:5432/apex_inn_pms}"

echo "⚠️  Restoring database from: $BACKUP_FILE"
echo "🎯 Target database: $DB_URL"
read -p "Are you sure you want to restore? This will overwrite target tables. (y/N): " confirm

if [[ "$confirm" =~ ^[Yy]$ ]]; then
  gunzip -c "$BACKUP_FILE" | psql "$DB_URL"
  echo "✅ Database restore completed successfully!"
else
  echo "❌ Restore cancelled."
fi
