#!/usr/bin/env bash
set -e

# ==============================================================================
# APEX INN — Production-Safe Prisma Migration Runner
# ==============================================================================
# Protocol:
# 1. Pre-flight verification
# 2. Automated pre-migration snapshot backup
# 3. Apply version-controlled migration via `prisma migrate deploy`
# 4. Verify post-migration database schema and data integrity
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🛡️ Starting APEX INN Production-Safe Migration Pipeline..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set."
  echo "   Usage: DATABASE_URL=\"postgresql://...\" ./scripts/deploy-production-migration.sh"
  exit 1
fi

MASKED_URL=$(echo "$DATABASE_URL" | sed -E 's/:([^:@]+)@/:****@/')
echo "🔗 Target Database: $MASKED_URL"

# 1. Take snapshot backup before touching schema
echo "📦 Step 1: Generating pre-migration safety backup..."
"$SCRIPT_DIR/backup-database.sh"

# 2. Apply migration
echo "🚀 Step 2: Applying version-controlled migrations (prisma migrate deploy)..."
cd "$ROOT_DIR"
npx prisma migrate deploy

# 3. Verify integrity
echo "🔍 Step 3: Verifying post-migration integrity..."
npx tsx "$SCRIPT_DIR/verify-remote-database.ts"

echo ""
echo "=========================================================="
echo "🌟 PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!"
echo "=========================================================="
echo "• Schema Version:  Up to date with version-controlled migrations"
echo "• Pre-Backup:      Stored safely in backups/sql/"
echo "• Zero Disruption: All existing records and relationships preserved"
echo "=========================================================="
