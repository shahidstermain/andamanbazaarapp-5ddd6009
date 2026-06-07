# AndamanBazaar Go-Live Checklist

**Project:** Migration from Lovable Cloud to self-hosted Supabase + Hostinger  
**Status:** Ready for execution  
**Last Updated:** 2026-06-07

---

## Pre-Deployment (Local)

### Code Changes
- [x] Removed `@lovable.dev/cloud-auth-js` dependency
- [x] Replaced Lovable OAuth with native `supabase.auth.signInWithOAuth()`
- [x] Updated `src/pages/AuthView.tsx` to use native Supabase
- [x] Deprecated `src/integrations/lovable/index.ts`
- [x] All TypeScript checks pass (`tsc --noEmit`)
- [x] Build succeeds (`vite build`)
- [x] Tests pass (`vitest run`)

### Infrastructure Templates
- [x] `docker-compose.yml` — Complete self-hosted Supabase stack
- [x] `.env.docker.template` — Environment variables with instructions
- [x] `nginx.conf.template` — Reverse proxy with SSL/TLS
- [x] `scripts/init-database.sh` — Database + bucket initialization
- [x] `scripts/migrate-data.sh` — Data migration from old to new
- [x] `DEPLOYMENT_STEPS.md` — Complete deployment guide
- [x] `MIGRATION_REQUIRED_INFO.md` — Credential checklist

### Documentation
- [x] Architecture diagrams
- [x] Security considerations
- [x] Troubleshooting guide
- [x] Rollback procedures

---

## Phase 1: Hostinger VPS Setup

### Infrastructure
- [ ] VPS provisioned (Ubuntu 22.04+)
- [ ] Root SSH access confirmed
- [ ] Firewall configured (22, 80, 443 open)
- [ ] Domain `api.andamanbazaar.in` DNS pointed to VPS IP

### Software Installation
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)
- [ ] Nginx installed (`nginx -v`)
- [ ] Certbot installed (`certbot --version`)
- [ ] System updated (`apt-get update && upgrade`)

### Environment Setup
- [ ] `.env.docker` created with all secrets filled in
- [ ] `docker-compose.yml` copied to VPS
- [ ] Permissions set correctly

**Estimated time:** 30 min

---

## Phase 2: Self-Hosted Supabase Deployment

### Docker Stack
- [ ] Services started: `docker-compose up -d`
- [ ] All containers healthy: `docker-compose ps` shows "healthy"
- [ ] Postgres responding: `docker exec andaman_postgres pg_isready`
- [ ] Kong gateway responding: `curl http://localhost:8000/`

### Database Initialization
- [ ] Migration script uploaded to VPS
- [ ] All migrations applied: `./init-database.sh`
- [ ] Storage buckets created (5 total)
- [ ] RLS policies applied

### SSL/TLS
- [ ] Certificate obtained: `certbot certonly --standalone -d api.andamanbazaar.in`
- [ ] Nginx config deployed to `/etc/nginx/sites-available/`
- [ ] Nginx health check passes: `nginx -t`
- [ ] HTTPS accessible: `curl https://api.andamanbazaar.in/` (200 response)

**Estimated time:** 45 min

---

## Phase 3: Data Migration

### Backup Old System
- [ ] Old Lovable database backed up to `data-backup-*/` directory
- [ ] Backup files verified and readable
- [ ] Service-role key from old project obtained

### Migrate Data
- [ ] Data migration script executed: `./scripts/migrate-data.sh`
- [ ] Auth users imported
- [ ] All public schema tables imported
- [ ] Row counts verified (old vs new)

### Storage Objects
- [ ] Storage bucket sync script run (if applicable)
- [ ] All images/PDFs copied from old to new
- [ ] Bucket checksums match (spot-check)

**Estimated time:** 30-60 min (depends on data size)

---

## Phase 4: Configure Edge Functions

### Secrets
- [ ] All 20+ edge function secrets set via Docker/Supabase CLI
- [ ] Secrets list:
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_WEBHOOK_SECRET`
  - [ ] `SEND_EMAIL_HOOK_SECRET`
  - [ ] `CASHFREE_APP_ID`
  - [ ] `CASHFREE_SECRET_KEY`
  - [ ] `CASHFREE_WEBHOOK_SECRET`
  - [ ] `CASHFREE_ENV`
  - [ ] `MINIMAX_API_KEY`
  - [ ] `GEMINI_API_KEY`
  - [ ] `LOVABLE_API_KEY` (optional)
  - [ ] `NEWS_AGENT_SECRET`
  - [ ] `AGENT_AUTHOR_ID`
  - [ ] `AFFILIATE_CONVERSION_SECRET`
  - [ ] `AFFILIATE_SUMMARY_FROM`
  - [ ] `AFFILIATE_SUMMARY_TO`

### Deployment
- [ ] All 33 edge functions deployed (or copied to `/functions`)
- [ ] Health check passes: `curl https://api.andamanbazaar.in/functions/v1/<function-name>`

**Estimated time:** 15 min

---

## Phase 5: Frontend Deployment

### Build
- [ ] Environment variables set:
  ```bash
  export VITE_SUPABASE_URL=https://api.andamanbazaar.in
  export VITE_SUPABASE_PUBLISHABLE_KEY=<new_anon_key>
  export VITE_SUPABASE_PROJECT_ID=andamanbazaar
  ```
- [ ] Build succeeds: `bun run build`
- [ ] `dist/` directory created

### Upload to Hostinger Cloud
- [ ] SFTP/File Manager access confirmed
- [ ] `dist/` contents uploaded to `~/public_html/`
- [ ] `.htaccess` configured for SPA rewrites (see `DEPLOYMENT_STEPS.md`)
- [ ] Static assets served: `curl https://andamanbazaar.in/` (200)

**Estimated time:** 20 min

---

## Phase 6: Validation & Smoke Testing

### Critical Path Tests

#### Authentication
- [ ] Email sign-up works
- [ ] Email confirmation link works
- [ ] Email/password sign-in works
- [ ] Google OAuth works (check redirect)
- [ ] Password reset email arrives
- [ ] Phone OTP for seller verification works

#### Marketplace
- [ ] Browse listings (GET `/listings`)
- [ ] Create listing (POST with image upload)
- [ ] Search/filter listings
- [ ] View listing detail page
- [ ] Add/remove favorites (realtime)
- [ ] Send message to seller (realtime chat)

#### Trip Planner
- [ ] Generate trip (AI call)
- [ ] View trip details
- [ ] Download PDF
- [ ] Affiliate recommendations appear

#### Payments
- [ ] Boost listing (Cashfree integration)
- [ ] Book trip (Cashfree integration)
- [ ] Payment webhook received in logs

#### Admin Features
- [ ] `/admin/trip-leads` accessible and shows data
- [ ] `/admin/release-notes` publish works
- [ ] `/admin/affiliates` shows metrics
- [ ] Admin dashboards load without errors

#### Realtime Features
- [ ] Chat messages appear realtime
- [ ] Notifications bell updates
- [ ] Visitor alerts trigger

### Browser Console
- [ ] No JavaScript errors
- [ ] No CORS errors
- [ ] No failed API calls

### Server Logs
- [ ] Nginx access log shows requests: `tail /var/log/nginx/andaman-api-access.log`
- [ ] Postgres logs show queries: `docker logs andaman_postgres`
- [ ] Kong logs show traffic: `docker logs andaman_kong`
- [ ] Auth logs show sessions: `docker logs andaman_auth`

**Estimated time:** 45 min (thorough testing)

---

## Phase 7: DNS Cutover (If Migrating from Lovable)

### Pre-Cutover
- [ ] All smoke tests pass on `api.andamanbazaar.in`
- [ ] All smoke tests pass on `andamanbazaar.in`
- [ ] Old Lovable system still live as fallback
- [ ] Recent data synced from old to new
- [ ] Backups verified and stored

### DNS Changes
- [ ] TTL on `andamanbazaar.in` A record lowered to 5 min
- [ ] Wait 30 min for TTL to flush
- [ ] Update `andamanbazaar.in` A record → Hostinger Cloud IP
- [ ] Update `api.andamanbazaar.in` A record → VPS IP
- [ ] Wait 5-10 min for DNS propagation
- [ ] Verify with: `nslookup andamanbazaar.in` and `nslookup api.andamanbazaar.in`

### Post-Cutover Monitoring
- [ ] Monitor Nginx access logs: `tail -f /var/log/nginx/andaman-api-access.log`
- [ ] Monitor error logs: `tail -f /var/log/nginx/andaman-api-error.log`
- [ ] Check database performance: `docker logs -f andaman_postgres`
- [ ] Spot-check user reports (Slack, email)
- [ ] Verify payment webhooks still work (check transaction logs)

**Estimated time:** 15 min (cutover) + 60 min (monitoring)

---

## Phase 8: Post-Live Tasks

### Day 1 (Go-Live Day)
- [ ] Monitor system for 4+ hours
- [ ] Check error logs every 30 min
- [ ] Verify incoming webhooks (Cashfree, Resend)
- [ ] Monitor database queries/locks: `docker exec andaman_postgres psql -U postgres -d postgres -c "\dS;"`
- [ ] Alert team for any issues

### Day 2-3 (Stabilization)
- [ ] Monitor system for 24+ hours
- [ ] Check for any background job failures
- [ ] Verify scheduled tasks work (affiliate summaries, news agents)
- [ ] Sync any last data from old system
- [ ] Update status page if applicable

### Day 5+ (Confirmation)
- [ ] Keep old Lovable system live for 72 hours
- [ ] Only after 72 hours: decommission old system if confident
- [ ] Store final backup of old data
- [ ] Archive credentials securely
- [ ] Update internal docs/runbooks

---

## Rollback Procedure (If Needed)

### Immediate Rollback (First 24 Hours)
1. Point DNS back to old Lovable IP
2. Clear browser cache (CloudFlare purge if applicable)
3. Wait for TTL (5 min)
4. Verify traffic on old system

### If Data Issue Found
1. Restore from `data-backup-*/` directories on VPS
2. Run: `pg_restore <backup_file>`
3. Restart services: `docker-compose down && docker-compose up -d`

### If Edge Function Issue Found
1. Redeploy edge function from Git: `supabase functions deploy <fn-name>`
2. Or revert to old Lovable backend temporarily

**Recovery time:** 5-15 min (DNS) + 10-30 min (data restore)

---

## Security Post-Deployment

- [ ] Google OAuth client secret rotated (old one was in public repo)
- [ ] GitHub repo made **private**
- [ ] All API keys stored in secure vault (1Password, LastPass, etc.)
- [ ] VPS firewall verified (only 22, 80, 443 open)
- [ ] SSH access via key-only (password auth disabled)
- [ ] Certbot auto-renewal configured (runs monthly)
- [ ] Database password strong and stored securely
- [ ] JWT_SECRET backed up securely
- [ ] No credentials in `.env` files committed to Git

---

## Operational Runbook Items

After go-live, create/update:

- [ ] **Backup Strategy**
  - [ ] Daily `pg_dump` backups to S3
  - [ ] MinIO storage backups
  - [ ] Backup retention: 30 days
  - [ ] Test restore procedure monthly

- [ ] **Monitoring**
  - [ ] Uptime monitoring (UptimeRobot, etc.)
  - [ ] Error rate dashboard (Sentry, LogRocket)
  - [ ] Database performance monitoring
  - [ ] SSL certificate expiry alerts

- [ ] **Scaling**
  - [ ] Document VPS resource limits
  - [ ] Procedure to upgrade VPS (CPU, RAM)
  - [ ] Procedure to upgrade storage (expand MinIO/EBS)
  - [ ] Load testing baseline recorded

- [ ] **Disaster Recovery**
  - [ ] RTO (Recovery Time Objective): < 1 hour
  - [ ] RPO (Recovery Point Objective): < 1 hour
  - [ ] Annual DR drill scheduled

---

## Sign-Off

- [ ] Project Lead: ________________  Date: _______
- [ ] DevOps/Infrastructure: ________________  Date: _______
- [ ] QA/Testing: ________________  Date: _______

---

## Contact & Escalation

**Primary Contact:**  
Name: _____________  
Phone: _____________  
Email: _____________  

**Escalation Contact (24/7):**  
Name: _____________  
Phone: _____________  
Email: _____________  

**Hostinger Support:**  
- Account: __________
- Support Email: support@hostinger.com
- Ticket URL: https://support.hostinger.com/

---

**Total Estimated Time:** 4-6 hours (end-to-end, one person)  
**Recommended Team Size:** 2 (one doing setup, one monitoring)  
**Maintenance Window Required:** 2-4 hours (minimal disruption approach) or full cutover window if possible

✅ **All set. Ready to deploy when credentials are provided.**
