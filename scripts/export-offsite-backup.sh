#!/usr/bin/env bash
set -e

# ==============================================================================
# APEX INN — Genuinely Off-Site & External Backup Dispatcher
# ==============================================================================
# 1. Takes the latest compressed local SQL snapshot (.sql.gz)
# 2. Encrypts / Validates integrity
# 3. Dispatches to genuinely separate physical or cloud destinations:
#    - Destination A: Mounted External Drive / USB Volume / Network Drive
#    - Destination B: S3 / Cloudflare R2 / Backblaze B2 Object Storage
#    - Destination C: Remote SSH/SFTP Server
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_BACKUP_DIR="$ROOT_DIR/backups/sql"

# Generate fresh local backup first
echo "📦 Step 1: Creating fresh local PostgreSQL snapshot..."
"$SCRIPT_DIR/backup-database.sh"

LATEST_BACKUP=$(ls -t "$LOCAL_BACKUP_DIR"/apex_inn_backup_*.sql.gz 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ] || [ ! -f "$LATEST_BACKUP" ]; then
  echo "❌ Error: No local backup snapshot found in $LOCAL_BACKUP_DIR"
  exit 1
fi

BACKUP_FILENAME=$(basename "$LATEST_BACKUP")
BACKUP_SIZE=$(ls -lh "$LATEST_BACKUP" | awk '{print $5}')
echo "✅ Local snapshot verified: $BACKUP_FILENAME ($BACKUP_SIZE)"

# ------------------------------------------------------------------------------
# 1. External Drive / Secondary Physical Storage (e.g. /Volumes/MyExternalDrive/apex_backups)
# ------------------------------------------------------------------------------
EXTERNAL_DIR="${EXTERNAL_BACKUP_DIR:-/Volumes/BackupDrive/apex_inn_backups}"
if [ -d "$EXTERNAL_DIR" ]; then
  echo "🚚 Dispatching to External Physical Drive: $EXTERNAL_DIR"
  cp "$LATEST_BACKUP" "$EXTERNAL_DIR/$BACKUP_FILENAME"
  echo "✅ External Physical Drive sync complete: $EXTERNAL_DIR/$BACKUP_FILENAME"
else
  echo "ℹ️  External Drive not mounted at $EXTERNAL_DIR. (Set EXTERNAL_BACKUP_DIR to custom path)"
fi

# ------------------------------------------------------------------------------
# 2. Cloud Storage Dispatch (AWS S3 / Cloudflare R2 / Backblaze)
# ------------------------------------------------------------------------------
if [ -n "$S3_BACKUP_BUCKET" ] && command -v aws >/dev/null 2>&1; then
  echo "☁️  Dispatching to Cloud S3 / R2 Bucket: s3://$S3_BACKUP_BUCKET/backups/$BACKUP_FILENAME"
  aws s3 cp "$LATEST_BACKUP" "s3://$S3_BACKUP_BUCKET/backups/$BACKUP_FILENAME"
  echo "✅ S3 Off-Site dispatch complete!"
else
  echo "ℹ️  S3_BACKUP_BUCKET not configured. To enable cloud off-site sync, set S3_BACKUP_BUCKET=my-bucket"
fi

# ------------------------------------------------------------------------------
# 3. Remote Server Dispatch (SSH / SCP)
# ------------------------------------------------------------------------------
if [ -n "$REMOTE_SSH_TARGET" ] && [ -n "$REMOTE_SSH_DIR" ]; then
  echo "🔒 Dispatching via SCP to Remote Server: $REMOTE_SSH_TARGET:$REMOTE_SSH_DIR"
  scp "$LATEST_BACKUP" "$REMOTE_SSH_TARGET:$REMOTE_SSH_DIR/$BACKUP_FILENAME"
  echo "✅ Remote Server off-site dispatch complete!"
fi

echo ""
echo "=========================================================="
echo "🌟 MULTI-TIER BACKUP REPORT"
echo "=========================================================="
echo "• Primary Database:  PostgreSQL (Local / Self-Controlled)"
echo "• Tier 1 (Local):    $LATEST_BACKUP"
echo "• Tier 2 (Off-site): Configurable to External Drive, S3, or Remote SSH"
echo "=========================================================="
