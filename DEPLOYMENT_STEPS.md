# Deployment Guide — AndamanBazaar Self-Hosted Migration

This guide walks through deploying AndamanBazaar to Hostinger with a self-hosted Supabase backend.

**Status:** Ready for execution once credentials are provided.

---

## Architecture

```
┌─ HOSTINGER CLOUD (Static Frontend) ─────────────────────────┐
│                                                              │
│  andamanbazaar.in → Nginx (hPanel)                          │
│  - Serve dist/ (Vite build)                                 │
│  - SPA rewrite rules                                         │
│  - HTTPS via Let's Encrypt or hPanel SSL                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ↓ API calls
┌─ HOSTINGER VPS (Self-hosted Supabase Backend) ──────────────┐
│                                                              │
│  api.andamanbazaar.in → Nginx + Certbot                     │
│  ↓                                                           │
│  Kong (API Gateway :8000)                                   │
│  ├─ Postgres 17 (:5432)                                     │
│  ├─ Auth (:9999)                                            │
│  ├─ Storage (:5000)                                         │
│  ├─ Realtime (:4000)                                        │
│  └─ MinIO S3 (:9000, :9001)                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before starting, you need:

### 1. Hostinger Accounts & Access

- [ ] **VPS SSH credentials**
  - Host/IP
  - Port (usually 22)
  - Username (usually `root` or `hstuser`)
  - SSH key or password
  - OS: Ubuntu 22.04 LTS or later recommended

- [ ] **Cloud Hosting credentials**
  - hPanel username/password
  - SFTP access (or File Manager in hPanel)
  - Domain `andamanbazaar.in` pointed at Hostinger nameservers

- [ ] **DNS access**
  - Registrar login to update DNS records
  - Ability to add A records for `api.andamanbazaar.in`

### 2. Old Supabase Project Access

- [ ] **Database connection string**
  - From: Supabase Dashboard → Settings → Database
  - Format: `postgresql://postgres:PASSWORD@db.tsduibmoqntxqdaswbef.supabase.co:5432/postgres`

- [ ] **Service Role Key**
  - From: Supabase Dashboard → Settings → API
  - Used for data + storage migration

### 3. Secrets & API Keys (see `MIGRATION_REQUIRED_INFO.md`)

- [ ] Google OAuth (rotated)
- [ ] Cashfree credentials
- [ ] Resend API key + webhook secret
- [ ] AI provider keys (MiniMax, Gemini)
- [ ] Affiliate/agent secrets

---

## Deployment Phases

### Phase 1: VPS Setup

#### 1.1 Connect to VPS

```bash
ssh -i your_key.pem root@your_vps_ip
# or: ssh root@your_vps_ip (if password auth)
```

#### 1.2 Install Docker & Docker Compose

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify
docker --version && docker-compose --version
```

#### 1.3 Install Nginx & Certbot

```bash
apt-get install -y nginx certbot python3-certbot-nginx

# Verify
nginx -v
```

#### 1.4 Configure Firewall

```bash
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

#### 1.5 Prepare Supabase Stack

```bash
# Create app directory
mkdir -p /opt/andamanbazaar && cd /opt/andamanbazaar

# Copy files from local repo
# (You'll SFTP docker-compose.yml and .env.docker from the repo)
# scp -r /Users/shahidster/AndamanBazaarApp docker-compose.yml root@vps_ip:/opt/andamanbazaar/

# Create .env file (from .env.docker.template)
cp .env.docker.template .env.docker
nano .env.docker  # Fill in all required values
```

---

### Phase 2: Start Self-Hosted Supabase

#### 2.1 Start Services

```bash
cd /opt/andamanbazaar

# Pull images
docker-compose pull

# Start all services
docker-compose up -d

# Wait for health checks
docker-compose ps

# Watch logs (ctrl-C to exit)
docker-compose logs -f postgres
```

#### 2.2 Verify Connectivity

```bash
# Test Postgres
docker exec andaman_postgres pg_isready

# Test Kong API
curl http://localhost:8000/

# Test Storage
curl http://localhost:5000/

# Test Auth
curl http://localhost:9999/health
```

---

### Phase 3: Initialize Database & Buckets

#### 3.1 Apply Migrations

```bash
# From your local machine, copy the migration script to VPS
scp scripts/init-database.sh root@vps_ip:/opt/andamanbazaar/

# SSH into VPS and run
ssh root@vps_ip
cd /opt/andamanbazaar

# Initialize database
export PGPASSWORD='your_postgres_password'
./init-database.sh postgresql://postgres:password@localhost:5432/postgres
```

This will:
- Apply all 54 migrations
- Create 5 storage buckets
- Set up RLS policies

---

### Phase 4: Configure Nginx Reverse Proxy

#### 4.1 Set Up SSL Certificate

```bash
ssh root@vps_ip

# Get SSL cert for api.andamanbazaar.in
certbot certonly --standalone -d api.andamanbazaar.in

# You'll be asked for your email and to agree to terms
# Certs will be stored in: /etc/letsencrypt/live/api.andamanbazaar.in/
```

#### 4.2 Install Nginx Config

```bash
# Copy Nginx config (already has cert paths)
scp nginx.conf.template root@vps_ip:/etc/nginx/sites-available/andamanbazaar-api

ssh root@vps_ip

# Test Nginx config
nginx -t

# Enable site
ln -s /etc/nginx/sites-available/andamanbazaar-api /etc/nginx/sites-enabled/

# Restart Nginx
systemctl restart nginx

# Verify it's running
curl https://api.andamanbazaar.in/
# Should get: 200 or a valid Kong response
```

---

### Phase 5: Migrate Production Data

#### 5.1 Backup Old Database

```bash
# From your local machine
export OLD_DB="postgresql://postgres:PASSWORD@db.tsduibmoqntxqdaswbef.supabase.co:5432/postgres"

# Run data migration script
./scripts/migrate-data.sh \
  "$OLD_DB" \
  "postgresql://postgres:YOUR_NEW_PASSWORD@api.andamanbazaar.in/postgres"

# This will:
# - Export all public schema data
# - Export auth users
# - Restore into new database
# - Verify row counts
```

#### 5.2 Migrate Storage Objects

```bash
# This requires a separate script using Supabase storage APIs
# See: STORAGE_MIGRATION.md (to be created)

# Quick script to copy objects bucket-by-bucket:
for bucket in listing-images post-images chat-images trip-pdfs verification-docs; do
  echo "Migrating $bucket..."
  # (Uses supabase-js storage API or s3cmd)
done
```

---

### Phase 6: Deploy Edge Functions

#### 6.1 Configure Secrets

On your VPS, set edge function secrets:

```bash
ssh root@vps_ip
cd /opt/andamanbazaar

# Using supabase CLI (if available):
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set CASHFREE_APP_ID=xxx
supabase secrets set MINIMAX_API_KEY=xxx
# ... (see MIGRATION_REQUIRED_INFO.md for full list)

# Or manually via Docker:
docker exec andaman_kong \
  env \
  RESEND_API_KEY=re_xxx \
  CASHFREE_APP_ID=xxx \
  ...
```

#### 6.2 Deploy Functions

```bash
# From local machine, deploy each function
supabase functions deploy trip-generate
supabase functions deploy trip-preview
supabase functions deploy send-auth-email
# ... (all 33 functions)

# Verify deployment
curl https://api.andamanbazaar.in/functions/v1/trip-generate
```

---

### Phase 7: Deploy Frontend to Hostinger Cloud

#### 7.1 Build Frontend

```bash
# From local machine
export VITE_SUPABASE_URL=https://api.andamanbazaar.in
export VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
export VITE_SUPABASE_PROJECT_ID=andamanbazaar

bun run build

# Output: dist/
```

#### 7.2 Upload to Hostinger Cloud

```bash
# Via hPanel File Manager or SFTP:
scp -r dist/* hstuser@andamanbazaar.in:~/public_html/
# or use FileZilla / hPanel uploader
```

#### 7.3 Configure SPA Rewrite Rules

In **hPanel → File Manager → public_html → .htaccess**:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Don't rewrite actual files/directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Rewrite all routes to index.html
  RewriteRule ^(.*)$ index.html [L]
</IfModule>
```

#### 7.4 Test Frontend

```bash
# Visit https://andamanbazaar.in
# Should load the app and connect to https://api.andamanbazaar.in

# Open browser console (F12) and check for errors
# Try signing in with email/password or Google OAuth
```

---

### Phase 8: Validation & Go-Live

#### 8.1 Smoke Test Checklist

- [ ] **Auth**
  - [ ] Email/password sign-up works
  - [ ] Email confirmation link works
  - [ ] Google OAuth works (redirect to https://api.andamanbazaar.in/auth/v1/callback)
  - [ ] Phone OTP for seller verification works
  - [ ] Password reset email works

- [ ] **Marketplace**
  - [ ] Create listing with image upload
  - [ ] Search listings
  - [ ] Add to favorites
  - [ ] Send message to seller (realtime chat works)

- [ ] **Trip Planner**
  - [ ] Generate trip from AI
  - [ ] Download trip as PDF
  - [ ] See recommendations

- [ ] **Payments**
  - [ ] Boost listing (Cashfree payment flow)
  - [ ] Book trip (Cashfree payment flow)
  - [ ] Payment webhook received (check logs)

- [ ] **Admin Dashboards**
  - [ ] `/admin/trip-leads` shows new leads
  - [ ] `/admin/release-notes` can publish
  - [ ] `/admin/affiliates` shows affiliate data

- [ ] **Notifications**
  - [ ] New chat message alerts
  - [ ] New visitor alerts
  - [ ] Realtime updates work

#### 8.2 Monitor Logs

```bash
# VPS Postgres
docker logs andaman_postgres

# Kong (API Gateway)
docker logs andaman_kong

# Auth
docker logs andaman_auth

# Storage
docker logs andaman_storage

# Nginx (reverse proxy)
ssh root@vps_ip tail -f /var/log/nginx/andaman-api-access.log
```

#### 8.3 DNS Cutover (If Migration from Lovable)

1. **Keep old setup live** while testing new one on `api.andamanbazaar.in`
2. **Sync any new data** from old system
3. **Update DNS A record** for `andamanbazaar.in` to point to Hostinger Cloud IP
4. **Update `api.andamanbazaar.in`** A record to point to VPS IP
5. **Wait for TTL** (usually 5 min - 1 hour)
6. **Verify traffic** is hitting new system (check logs)
7. **Keep old system** as backup for 24-48 hours

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5432 (Postgres)
sudo lsof -i :5432
sudo kill -9 <PID>
```

### Docker Memory Issues

```bash
# Increase Docker memory
docker update --memory 4g andaman_postgres
docker update --memory 2g andaman_kong
```

### SSL Certificate Renewal

```bash
# Certbot auto-renews every 60 days
# Manually renew:
certbot renew --force-renewal

# Nginx will reload automatically
systemctl reload nginx
```

### Database Locked

```bash
# If migrations fail due to locks:
docker exec andaman_postgres \
  psql -U postgres -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='postgres' AND pid<>pg_backend_pid();"
```

---

## Rollback Plan

If something breaks:

1. **Old Lovable system** is still live at the old IP (if you kept it)
2. **DNS revert:** Point `andamanbazaar.in` back to Lovable IP
3. **Data safety:** All old data is in backups (`data-backup-*` directories)
4. **Edge functions:** All 33 functions are in the repo; can redeploy to Lovable

---

## Next Steps After Go-Live

- [ ] Monitor error logs for 48 hours
- [ ] Set up automated backups (pg_dump + S3)
- [ ] Enable CloudFlare DNS for extra redundancy
- [ ] Make GitHub repo private
- [ ] Document runbook for ops team
- [ ] Plan capacity scaling (CPU, RAM, storage)

---

## Support

For questions or issues:
1. Check `DEPLOYMENT_STEPS.md` (this file)
2. Check edge function logs: `docker logs andaman_*`
3. Check Nginx logs: `/var/log/nginx/andaman-api-*.log`
4. Check Postgres logs: `docker logs andaman_postgres`
5. Check browser console (F12) on the frontend
