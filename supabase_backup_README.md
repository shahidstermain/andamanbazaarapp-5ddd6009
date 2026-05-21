# AndamanBazaar Supabase Backup

## Contents

```
.
├── config.toml          # Supabase project config
├── migrations/          # 54 migration files (3822 lines)
│   └── full_backup.sql # Combined migration (run this)
└── functions/          # Edge functions (22 functions)
    └── _shared/        # Shared utilities including ai-gateway.ts
```

## Restore to Self-Hosted Supabase

### Option 1: Full Restore (recommended)

```bash
# 1. Start local Supabase
supabase start

# 2. Reset local database
supabase db reset

# 3. Apply migrations
psql -h localhost -p 54322 -U postgres -d postgres -f full_backup.sql
```

### Option 2: Migration-based

```bash
supabase db migrate up
```

## Edge Functions

Deploy edge functions:
```bash
supabase functions deploy trip-generate
supabase functions deploy trip-preview
supabase functions deploy trip-recommendations
supabase functions deploy generate-listing-description
supabase functions deploy andaman-stories-agent
supabase functions deploy andaman-news-agent
supabase functions deploy affiliate-weekly-summary
# ... other functions
```

## Environment Variables Required

Set these in local `.env` or Supabase secrets:

```
SUPABASE_URL=https://tsduibmoqntxqdaswbef.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MINIMAX_API_KEY=your_minimax_key
LOVABLE_API_KEY=your_lovable_key
GEMINI_API_KEY=your_gemini_key
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
```

## Notes

- Migration `DASHBOARD_RUN_THIS.sql` may contain dashboard-specific SQL
- Edge functions are in `functions/` - deploy individually or use supabase cli
- AI gateway is at `functions/_shared/ai-gateway.ts` - hybrid MiniMax + Lovable

## Backup Date

Generated: 2025-05-21
Project Ref: msxeqzceqjatoaluempo
