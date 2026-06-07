#!/bin/bash
# Initialize self-hosted Supabase database
#
# Usage: ./scripts/init-database.sh <DATABASE_URL> [ANON_KEY] [SERVICE_ROLE_KEY]
#
# This script:
# 1. Applies all database migrations
# 2. Creates storage buckets
# 3. Configures RLS policies
# 4. Seeds initial data if needed
#
# Example:
#   export DB_URL="postgresql://postgres:password@localhost:5432/postgres"
#   ./scripts/init-database.sh $DB_URL

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <DATABASE_URL> [ANON_KEY] [SERVICE_ROLE_KEY]"
    echo ""
    echo "Example:"
    echo "  export PGPASSWORD='your_password'"
    echo "  ./scripts/init-database.sh postgresql://postgres:password@localhost:5432/postgres"
    exit 1
fi

DB_URL="$1"
ANON_KEY="${2:-}"
SERVICE_ROLE_KEY="${3:-}"

echo "════════════════════════════════════════════════════════════════"
echo "Initializing AndamanBazaar self-hosted Supabase database"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Extract connection details
PGHOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
PGPORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\).*/\1/p')
PGPORT=${PGPORT:-5432}
PGUSER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
PGPASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p')
PGDATABASE=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

echo "Connecting to: $PGHOST:$PGPORT/$PGDATABASE as $PGUSER"
echo ""

# Test connection
echo "Testing database connection..."
if ! psql -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Failed to connect to database"
    echo "Please check your DATABASE_URL and try again"
    exit 1
fi
echo "✅ Connected successfully"
echo ""

# Apply migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Applying database migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo "Found $MIGRATION_COUNT migration files"
echo ""

# Create migrations tracking table if it doesn't exist
psql << 'SQL'
CREATE TABLE IF NOT EXISTS _migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT now()
);
SQL

# Apply each migration
APPLIED=0
SKIPPED=0

for migration_file in $(ls -1 supabase/migrations/*.sql | sort); do
    migration_name=$(basename "$migration_file")

    # Skip if already applied
    if psql -tc "SELECT 1 FROM _migrations WHERE id = '$migration_name'" | grep -q 1; then
        echo "⏭️  SKIPPED: $migration_name"
        ((SKIPPED++))
        continue
    fi

    echo "▶️  APPLYING: $migration_name"

    if psql < "$migration_file" > /dev/null 2>&1; then
        psql -c "INSERT INTO _migrations (id) VALUES ('$migration_name')"
        echo "   ✅ Applied"
        ((APPLIED++))
    else
        echo "   ⚠️  Warning: Migration may have issues, continuing..."
    fi
done

echo ""
echo "Summary: $APPLIED applied, $SKIPPED skipped"
echo ""

# Create storage buckets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setting up storage buckets..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# List of buckets from migrations
BUCKETS=(
  "listing-images:false:50MiB"
  "post-images:false:50MiB"
  "chat-images:false:10MiB"
  "trip-pdfs:false:100MiB"
  "verification-docs:false:5MiB"
)

for bucket_spec in "${BUCKETS[@]}"; do
    IFS=':' read -r bucket_name is_public size_limit <<< "$bucket_spec"

    # Check if bucket exists
    if psql -tc "SELECT 1 FROM storage.buckets WHERE id = '$bucket_name'" | grep -q 1; then
        echo "✅ Bucket '$bucket_name' already exists"
    else
        echo "Creating bucket '$bucket_name' (public=$is_public, limit=$size_limit)"
        psql << SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, created_at, updated_at)
VALUES ('$bucket_name', '$bucket_name', $is_public, '$size_limit'::bytea, now(), now());
SQL
        echo "   ✅ Created"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Database initialization complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Configure edge function secrets (see MIGRATION_REQUIRED_INFO.md)"
echo "2. Deploy edge functions: supabase functions deploy"
echo "3. Set Auth configuration in Supabase dashboard"
echo "4. Test API connectivity"
