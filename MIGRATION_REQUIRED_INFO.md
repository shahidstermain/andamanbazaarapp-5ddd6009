# Migration — Required Information Checklist

**Status:** Stage 0 (local baseline) complete. Proceeding to Stage 1 requires the items below.

**Blocking:** Do NOT proceed with VPS provisioning, data migration, or code changes until these are provided.

---

## ⚠️ IMMEDIATE SECURITY ACTIONS (independent of timeline)

### 1. Rotate Google OAuth secret (HIGH PRIORITY)
- **Problem:** `supabase/config.toml` contains a live Google OAuth client secret (`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`) committed to a **public GitHub repo**.
- **Action:** Go to [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 Credentials → rotate the secret now.
- **New secret needed for:** Supabase Auth config on the new self-hosted instance.

### 2. Repository visibility (RECOMMENDED)
- [ ] Make the GitHub repo **private** (currently public and exposes full schema).

---

## Infrastructure — Hostinger

### Hostinger Cloud Hosting (Frontend)
- [ ] hPanel/SFTP credentials to upload to `public_html`
- [ ] Confirmation that `andamanbazaar.in` DNS is pointed at Hostinger Cloud

### Hostinger VPS (Backend — self-hosted Supabase)
- [ ] **VPS created?** If not, what plan do you need help provisioning?
- [ ] **OS / specs:** Ubuntu 22.04+ recommended, how much RAM/CPU?
- [ ] **Root SSH:** host/IP, username, SSH key (or password if password auth enabled)
- [ ] **Public IP:** for DNS `api.andamanbazaar.in` A record

---

## DNS

- [ ] Access to DNS registrar / control panel for `andamanbazaar.in`
- [ ] Ability to add/update A records (for `api.` subdomain)
- [ ] Ability to lower TTL before cutover (recommended: 1 hour before, 5 min for A records)

---

## OLD Supabase Project (data migration source)

### From https://app.supabase.com — project `tsduibmoqntxqdaswbef`

- [ ] **DB Connection String** (Supabase Dashboard → Settings → Database → "Connection string" tab → URI for external connections)
  - Format: `postgresql://postgres:PASSWORD@db.tsduibmoqntxqdaswbef.supabase.co:5432/postgres`
  - **DO NOT share the password in plain text;** provide securely or reference how to retrieve it
  
- [ ] **Service Role Key** (Settings → API → Service role key)
  - Used to: export auth users + copy storage objects
  - Looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

- [ ] **Anon Key** (Settings → API → Anon public key)
  - For reference only; currently exposed in the public repo `.env`

---

## Secrets for New Backend (self-hosted Supabase)

### Payments — Cashfree

- [ ] `CASHFREE_APP_ID` (your merchant ID)
- [ ] `CASHFREE_SECRET_KEY` (signing key)
- [ ] `CASHFREE_WEBHOOK_SECRET` (for verifying webhooks)
- [ ] `CASHFREE_ENV` (value: `"PROD"` or `"SANDBOX"` / which environment should it use?)

### Email — Resend

- [ ] `RESEND_API_KEY` (API key)
- [ ] `RESEND_WEBHOOK_SECRET` (for resend-webhook function)
- [ ] Verified sending domain in Resend (e.g., `support@andamanbazaar.in` or via Resend domain)
- [ ] `SEND_EMAIL_HOOK_SECRET` (custom secret for Supabase auth email hook → send-auth-email function; can be any strong random string, e.g., `openssl rand -hex 32`)

### AI Providers

- [ ] `MINIMAX_API_KEY` (for trip generation + stories agent)
- [ ] `GEMINI_API_KEY` (for listing descriptions)
- [ ] `LOVABLE_API_KEY` (optional: keep as fallback in `_shared/ai-gateway.ts`, or drop entirely)

### Content Agents

- [ ] `NEWS_AGENT_SECRET` (custom secret for triggering news/stories agents; e.g., `openssl rand -hex 32`)
- [ ] `AGENT_AUTHOR_ID` (Supabase user UUID that will own auto-generated posts; or "anonymous")

### Affiliate System

- [ ] `AFFILIATE_CONVERSION_SECRET` (custom secret for affiliate-conversion webhook; e.g., `openssl rand -hex 32`)
- [ ] `AFFILIATE_SUMMARY_FROM` (email address for "from" field in weekly summaries)
- [ ] `AFFILIATE_SUMMARY_TO` (email address for "to" field in weekly summaries, or JSON array of email addresses)

### Phone OTP (if seller verification stays on)

- [ ] If using **Twilio:** Account SID, Auth Token, phone number for SMS
- [ ] Or preferred SMS provider (Vonage, MessageBird, etc.)

---

## Google OAuth (New, rotated secret)

- [ ] **New Client ID** (from Google Cloud Console after rotating)
- [ ] **New Client Secret** (from Google Cloud Console after rotating)
- [ ] **Redirect URI** for the new backend: `https://api.andamanbazaar.in/auth/v1/callback`

---

## Data Migration Scope

Confirmed: **Full production migration** (all users, listings, chats, payments, images, PDFs).

- [ ] Confirm this is OK (production users + data will be copied to new instance)
- [ ] Backup of old Lovable project taken? (recommended before any migration)

---

## Other Questions

- [ ] Should the frontend be served from `andamanbazaar.in` with trailing index files, or should Nginx have SPA rewrite rules?
- [ ] Are there any custom domain/SSL certificates needed (Let's Encrypt automatic, or existing certs)?
- [ ] Should email deliverability be tested in staging first, or go live with Resend immediately?
- [ ] Any specific uptime requirements / maintenance window for the cutover (DNS flip)?

---

## How to Provide This Info

1. **Passwords / secrets:** Use a secure method (encrypted email, password manager share, 1Password vault share, etc.) — **NOT plain text in chat**.
2. **SSH key:** If needed, provide the public key; keep the private key secure.
3. **Credentials:** Provide only what's absolutely needed at each stage (don't dump everything at once).

---

## What Happens Next (once info is provided)

1. ✅ Stage 1A: SSH into Hostinger VPS, set up Docker + Docker Compose + Nginx + certbot
2. ✅ Stage 1B: Deploy self-hosted Supabase, generate new keys, test connectivity
3. ✅ Stage 1C: Apply schema (54 migrations), create storage buckets, configure Auth
4. ✅ Stage 2: Export auth + public data from old project, restore into new Supabase
5. ✅ Stage 3: Update app code (remove Lovable OAuth, point to new backend)
6. ✅ Stage 4: Build + deploy frontend to Hostinger Cloud
7. ✅ Stage 5: Validation (smoke test all features)
8. ✅ Stage 6: DNS cutover (point andamanbazaar.in at new stack)

**Estimated timeline:** 1–3 days with access to all infra + credentials.
