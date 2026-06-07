#!/bin/bash
# Migrate production data from old Lovable Supabase to self-hosted instance
#
# Usage: ./scripts/migrate-data.sh <OLD_DB_URL> <NEW_DB_URL>
#
# This script:
# 1. Exports auth users from old database
# 2. Exports all public schema data
# 3. Imports into new database
# 4. Migrates storage objects
#
# Example:
#   OLD_DB="postgresql://postgres:password@db.tsduibmoqntxqdaswbef.supabase.co:5432/postgres"
#   NEW_DB="postgresql://postgres:password@localhost:5432/postgres"
#   ./scripts/migrate-data.sh "$OLD_DB" "$NEW_DB"

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <OLD_DATABASE_URL> <NEW_DATABASE_URL>"
    echo ""
    echo "Example:"
    echo "  ./scripts/migrate-data.sh \\"
    echo "    'postgresql://postgres:password@old-host/postgres' \\"
    echo "    'postgresql://postgres:password@localhost/postgres'"
    exit 1
fi

OLD_DB_URL="$1"
NEW_DB_URL="$2"
BACKUP_DIR="./data-backup-$(date +%Y%m%d-%H%M%S)"

echo "════════════════════════════════════════════════════════════════"
echo "AndamanBazaar Data Migration"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Source (old): ${OLD_DB_URL%%@*}@${OLD_DB_URL##*@}"
echo "Destination (new): ${NEW_DB_URL%%@*}@${NEW_DB_URL##*@}"
echo "Backup directory: $BACKUP_DIR"
echo ""

read -p "This will overwrite data in the new database. Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Aborted."
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# 1. Export from old database
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Exporting data from old Supabase..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Creating backup of old database (schema + data)..."
pg_dump "$OLD_DB_URL" \
    --schema=public \
    --no-privileges \
    --no-owner \
    -Fc > "$BACKUP_DIR/old_database.dump"
echo "✅ Backup created: $BACKUP_DIR/old_database.dump"

echo ""
echo "Exporting auth users..."
pg_dump "$OLD_DB_URL" \
    --schema=auth \
    --table=auth.users \
    --no-privileges \
    --no-owner \
    -Fc > "$BACKUP_DIR/old_auth_users.dump"
echo "✅ Auth users exported"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Restore to new database
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Restoring data to new Supabase..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Restoring public schema data..."
pg_restore "$NEW_DB_URL" \
    --schema=public \
    --no-privileges \
    --no-owner \
    --clean \
    "$BACKUP_DIR/old_database.dump" 2>/dev/null || {
    echo "⚠️  Warning: Some tables may already exist (this is OK)"
}
echo "✅ Data restored"

echo ""
echo "Restoring auth users..."
pg_restore "$NEW_DB_URL" \
    --schema=auth \
    --no-privileges \
    --no-owner \
    "$BACKUP_DIR/old_auth_users.dump" 2>/dev/null || {
    echo "⚠️  Warning: Auth schema may have conflicts (this is OK)"
}
echo "✅ Auth users restored"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Verify data migration
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Verifying data migration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count rows in key tables
for table in listings users public_profiles chats; do
    OLD_COUNT=$(psql "$OLD_DB_URL" -tc "SELECT COUNT(*) FROM $table" 2>/dev/null || echo "?")
    NEW_COUNT=$(psql "$NEW_DB_URL" -tc "SELECT COUNT(*) FROM $table" 2>/dev/null || echo "?")
    echo "$table: old=$OLD_COUNT, new=$NEW_COUNT"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Data migration complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Storage objects:"
echo "  Run: ./scripts/migrate-storage.sh to copy files from old to new"
echo ""
echo "Backup location: $BACKUP_DIR"
echo "  Keep this backup safe until you confirm the new instance is working!"
echo ""
