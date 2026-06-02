## Heads-up on the ID you sent

`23897363932` looks like a **Google Ads Campaign ID**, not what gtag needs. Conversion tracking and AdSense each need a different identifier:

- **Conversion tracking** needs a Google Ads **Conversion ID** in the form `AW-XXXXXXXXXX` (10 digits, no dashes inside), plus a **Conversion label** per action you want to track. You get both from Google Ads → Tools → Conversions → create a conversion action → "Use Google tag".
- **AdSense** needs a **Publisher ID** in the form `ca-pub-XXXXXXXXXXXXXXXX`. You only get this after AdSense approves your site.

I'll build the integration so it works the moment you paste those into the admin settings — no redeploy required. Until then, conversion firing and ad rendering stay disabled automatically.

## What gets built

### 1. Settings (admin-managed, no redeploy needed)

Extend the existing `site_settings` row (used by `SiteSettingsCard`) with four nullable fields:

- `google_ads_conversion_id` — e.g. `AW-1234567890`
- `google_ads_conversion_labels` — JSON map of action → label, e.g. `{ "signup":"abcDEF123", "listing_posted":"…", "lead_submitted":"…", "trip_paid":"…", "booking_paid":"…", "boost_paid":"…" }`
- `adsense_publisher_id` — e.g. `ca-pub-1234567890123456`
- `adsense_enabled` — boolean kill switch

Edited in **Admin → Site settings**, with field-level helper text linking to where in Google Ads / AdSense to find each value. Validation: regex check on the ID shapes before save.

### 2. gtag loader

New `src/lib/gtag.ts` + a small `<GtagLoader />` mounted in `App.tsx`:

- Reads the settings via the existing `useSiteMeta` hook.
- If `google_ads_conversion_id` is set, injects `https://www.googletagmanager.com/gtag/js?id=AW-…` once, then runs the standard `gtag('config', 'AW-…')`.
- If `adsense_publisher_id` is set AND `adsense_enabled`, injects `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-…&crossorigin=anonymous` once.
- Both loaders are no-ops in dev (`import.meta.env.DEV`) so you don't pollute reports with developer sessions, and skipped on any route under `/admin/*` so admin clicks never count as conversions.
- Per your answer, **no consent banner** — tags load on first paint. (I'll still set `gtag('set', 'ads_data_redaction', true)` so we don't send URL query strings that may contain PII.)

Exports a single helper:

```ts
trackConversion("listing_posted", { value: 99, currency: "INR", transaction_id: order.id })
```

It resolves the label from settings; if missing, it logs once to `console.warn` and no-ops (so a misconfigured label can never crash a checkout).

### 3. Conversion events wired into existing flows

Hook `trackConversion(...)` into the call sites we already have:

| Action key        | Where it fires                                                                 | Value sent                     |
|-------------------|--------------------------------------------------------------------------------|--------------------------------|
| `signup`          | `AuthView.tsx` — on successful new-user signup (email + Google)               | none                           |
| `listing_posted`  | `CreateListing.tsx` — after the insert succeeds                                | none                           |
| `lead_submitted`  | `MessageSellerPanel.tsx` + `BookingLeadDialog.tsx` + `TripPlannerLeadForm.tsx` | none                           |
| `trip_paid`       | `cashfree-verify-trip-payment` → success redirect handler in `MyTrips.tsx`     | `value` from order, INR        |
| `booking_paid`    | `cashfree-verify-payment` → success handler in `ListingDetail.tsx`             | `value` from order, INR        |
| `boost_paid`      | `BoostListingDialog.tsx` after successful verify                               | `value` from boost price       |

For the two **paid** events we also forward `transaction_id` so Google can de-duplicate if the user reloads the success page.

Enhanced Conversions: when the user is logged in we hash their email client-side (SHA-256) and pass it as `user_data` so Google can match offline. No raw email sent.

### 4. AdSense slots (no auto-ads)

We use **manual ad units** so layout stays predictable instead of `data-ad-frequency-hint`-style auto-ads ripping through the page. A new `<AdSlot slot="…" format="auto" />` component:

- Renders nothing if `adsense_enabled` is false, the publisher ID is missing, on `/admin/*`, on auth pages, or for verified-paid placements (e.g. inside the chat thread, inside the trip planner success page) — so we never run ads on a screen the user paid for.
- Once you've created ad units in AdSense, you paste the **slot IDs** into the same admin form (one per placement).

Three placements to start:

1. `BlogPost.tsx` — one in-article slot after the first H2.
2. `Blog.tsx` index — one slot between rows 3 and 4 of the post grid.
3. `Listings.tsx` — one slot every ~12 cards.

(Easy to add more later; the component is location-agnostic.)

### 5. Robots / privacy / SEO hygiene

- Add `/admin/` is already disallowed in `robots.txt` — leave that.
- Add `ads.txt` at `public/ads.txt` with the canonical AdSense line once the publisher ID is set; until then a TODO comment.
- `next-on` is N/A (Vite). No changes to `index.html` head — gtag/AdSense scripts injected at runtime so we don't ship empty tag URLs.

### 6. Admin "Diagnostics" panel

A small section inside `AdminVisitors.tsx` that shows:

- ✅/❌ gtag loaded (checks `window.gtag`).
- ✅/❌ AdSense loaded (checks `window.adsbygoogle`).
- Last 10 conversion events fired in this browser session (kept in `sessionStorage` for QA).
- A "Send test conversion" button per action so you can verify wiring against Google Ads' Conversions debugger.

## Technical details

- **Schema change**: one migration adds the four columns to `site_settings` with sensible defaults (`null`, `false`). RLS on that table already restricts writes to admins — no policy change needed.
- **Type safety**: regex guards on `^AW-\d{8,12}$` and `^ca-pub-\d{16}$` in the settings form + the loader; bad input is treated as "not configured".
- **No third-party libs**: vanilla `<script>` injection, ~120 lines total. No `react-gtm-module`, no `react-adsense`.
- **Cookies**: gtag will drop `_gcl_au` and `_gads` cookies. Because you opted out of a consent banner, we add a short paragraph to `PrivacyPolicy.tsx` disclosing this and linking to Google's opt-out, which is what you'll want for ASCI / DPDP compliance.
- **CSP**: `index.html` has no CSP header today, so nothing to update. If you add one later, allowlist `*.googletagmanager.com`, `*.googlesyndication.com`, `*.doubleclick.net`, `*.google.com`.

## What I need from you after the build ships

1. Create one conversion action in Google Ads for each row in the table above; paste the **Conversion ID** + the six **labels** into Admin → Site settings.
2. Once AdSense approves the site, paste the **Publisher ID** + the three slot IDs into the same form and flip `adsense_enabled` on.
3. (Optional) Send me your Campaign ID separately if you want me to add UTM-tagged outbound links from blog posts to specific landing pages — different feature, happy to scope.

Ready to implement?