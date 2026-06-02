// Lightweight Google Ads (gtag.js) + AdSense loader.
//
// Both scripts are injected at runtime once the admin has saved
// their IDs in Site settings, so we never ship empty <script src=…>
// tags before the IDs are known. Dev sessions are skipped to avoid
// polluting Google Ads conversion reports with developer clicks.

import type { SiteSettings } from "@/lib/siteSettings";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    adsbygoogle?: unknown[];
    __abAdsCookieBannerShown?: boolean;
  }
}

const AW_REGEX = /^AW-\d{8,12}$/;
const PUB_REGEX = /^ca-pub-\d{16}$/;
const LABEL_REGEX = /^[A-Za-z0-9_-]{6,60}$/;

export type ConversionAction =
  | "signup"
  | "listing_posted"
  | "lead_submitted"
  | "trip_paid"
  | "booking_paid"
  | "boost_paid";

export type ConversionPayload = {
  /** Revenue in the action's currency, when applicable. */
  value?: number;
  currency?: string;
  /** Used by Google to de-duplicate on page reloads. */
  transaction_id?: string;
  /** Optional sha256-hashed email for enhanced conversions. */
  hashed_email?: string;
};

let gtagScriptInjected = false;
let gtagConfiguredFor: string | null = null;
let adsenseScriptInjected = false;
const warnedActions = new Set<string>();

/** Returns true when the current pathname is admin-only or otherwise excluded. */
export function isExcludedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/") ||
    pathname === "/admin" ||
    pathname.startsWith("/auth/callback") ||
    pathname === "/reset-password" ||
    pathname === "/payment-test"
  );
}

function shouldLoadGtag(): boolean {
  if (typeof window === "undefined") return false;
  // Skip during local development to keep reports clean.
  if (import.meta.env.DEV) return false;
  return !isExcludedPath(window.location.pathname);
}

export function isValidConversionId(id: string | null | undefined): id is string {
  return !!id && AW_REGEX.test(id.trim());
}

export function isValidPublisherId(id: string | null | undefined): id is string {
  return !!id && PUB_REGEX.test(id.trim());
}

export function isValidLabel(label: string | null | undefined): label is string {
  return !!label && LABEL_REGEX.test(label.trim());
}

/** Inject gtag.js (Google Ads tag) once. */
export function ensureGtag(conversionId: string): void {
  if (!shouldLoadGtag()) return;
  if (!isValidConversionId(conversionId)) return;

  if (!gtagScriptInjected) {
    window.dataLayer = window.dataLayer || [];
    // Use the function name "gtag" exactly as Google docs recommend.
    window.gtag = function gtag(...args: unknown[]) {
      // eslint-disable-next-line prefer-rest-params
      (window.dataLayer as unknown[]).push(args);
    };
    window.gtag("js", new Date());
    // Reduce sending URL query strings that may contain PII.
    window.gtag("set", "ads_data_redaction", true);

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(conversionId)}`;
    document.head.appendChild(s);
    gtagScriptInjected = true;
  }

  if (gtagConfiguredFor !== conversionId) {
    window.gtag?.("config", conversionId, { allow_enhanced_conversions: true });
    gtagConfiguredFor = conversionId;
  }
}

/** Inject AdSense loader script once. */
export function ensureAdsense(publisherId: string): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.DEV) return;
  if (!isValidPublisherId(publisherId)) return;
  if (isExcludedPath(window.location.pathname)) return;
  if (adsenseScriptInjected) return;

  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  document.head.appendChild(s);
  adsenseScriptInjected = true;
}

/** Fast SHA-256 → lowercase hex helper for enhanced conversions. */
export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type LabelMap = Partial<Record<ConversionAction, string>>;

function readSettings(): {
  conversionId: string | null;
  labels: LabelMap;
} {
  // The provider attaches the live settings onto window.__abSiteSettings
  // (see GtagLoader) so trackConversion can stay synchronous.
  const s = (window as unknown as { __abSiteSettings?: Partial<SiteSettings> }).__abSiteSettings;
  const conversionId = isValidConversionId(s?.google_ads_conversion_id ?? null)
    ? (s!.google_ads_conversion_id as string).trim()
    : null;
  const rawLabels = s?.google_ads_conversion_labels ?? {};
  const labels: LabelMap = {};
  if (rawLabels && typeof rawLabels === "object") {
    for (const [k, v] of Object.entries(rawLabels as Record<string, unknown>)) {
      if (typeof v === "string" && isValidLabel(v)) {
        labels[k as ConversionAction] = v.trim();
      }
    }
  }
  return { conversionId, labels };
}

function pushEventLog(action: ConversionAction, sent: boolean, reason?: string) {
  try {
    if (typeof sessionStorage === "undefined") return;
    const key = "ab.conv.log";
    const raw = sessionStorage.getItem(key);
    const list: Array<{ at: string; action: string; sent: boolean; reason?: string }> = raw
      ? JSON.parse(raw)
      : [];
    list.unshift({ at: new Date().toISOString(), action, sent, reason });
    sessionStorage.setItem(key, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* ignore */
  }
}

/** Fire a Google Ads conversion. Safe no-op when not configured. */
export function trackConversion(action: ConversionAction, payload: ConversionPayload = {}): void {
  try {
    if (typeof window === "undefined") return;
    if (import.meta.env.DEV) {
      pushEventLog(action, false, "dev mode");
      return;
    }
    if (isExcludedPath(window.location.pathname)) {
      pushEventLog(action, false, "excluded path");
      return;
    }
    const { conversionId, labels } = readSettings();
    if (!conversionId) {
      pushEventLog(action, false, "no conversion id");
      return;
    }
    const label = labels[action];
    if (!label) {
      if (!warnedActions.has(action)) {
        warnedActions.add(action);
        // eslint-disable-next-line no-console
        console.warn(`[gtag] No conversion label set for action "${action}". Skipping.`);
      }
      pushEventLog(action, false, "no label");
      return;
    }
    ensureGtag(conversionId);
    const params: Record<string, unknown> = {
      send_to: `${conversionId}/${label}`,
    };
    if (typeof payload.value === "number" && Number.isFinite(payload.value)) {
      params.value = payload.value;
    }
    if (payload.currency) params.currency = payload.currency;
    if (payload.transaction_id) params.transaction_id = payload.transaction_id;
    if (payload.hashed_email) {
      window.gtag?.("set", "user_data", { sha256_email_address: payload.hashed_email });
    }
    window.gtag?.("event", "conversion", params);
    pushEventLog(action, true);
  } catch (e) {
    // Conversion tracking must never break the user flow.
    pushEventLog(action, false, (e as Error).message);
  }
}

/** Helper: fire a conversion with an already-known user email. */
export async function trackConversionForUser(
  action: ConversionAction,
  userEmail: string | null | undefined,
  payload: ConversionPayload = {},
): Promise<void> {
  let hashed: string | undefined;
  if (userEmail) {
    try {
      hashed = await sha256Hex(userEmail);
    } catch {
      /* ignore — fallback to non-enhanced */
    }
  }
  trackConversion(action, { ...payload, hashed_email: hashed ?? payload.hashed_email });
}

/** Read the in-memory diagnostic log used by the admin panel. */
export function readConversionLog(): Array<{ at: string; action: string; sent: boolean; reason?: string }> {
  try {
    if (typeof sessionStorage === "undefined") return [];
    const raw = sessionStorage.getItem("ab.conv.log");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
