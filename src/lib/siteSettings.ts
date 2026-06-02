import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  site_title: string;
  site_description: string;
  github_repo_url: string | null;
  visitor_alerts_enabled: boolean;
  visitor_alerts_in_app: boolean;
  visitor_alerts_email_enabled: boolean;
  visitor_alert_email: string | null;
  visitor_alerts_webhook_enabled: boolean;
  visitor_alert_webhook_url: string | null;
  // Google Ads + AdSense (admin-managed, public-readable so the
  // client can configure gtag/adsbygoogle without a redeploy).
  google_ads_conversion_id: string | null;
  google_ads_conversion_labels: Record<string, string>;
  adsense_publisher_id: string | null;
  adsense_enabled: boolean;
  adsense_slot_ids: Record<string, string>;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_title: "AndamanBazaar — Island marketplace, boat pe bharosa",
  site_description:
    "AndamanBazaar is the hyperlocal marketplace for the Andaman Islands — buy, sell, and chat with trusted local sellers across Port Blair, Havelock, and Neil.",
  github_repo_url: null,
  visitor_alerts_enabled: true,
  visitor_alerts_in_app: true,
  visitor_alerts_email_enabled: false,
  visitor_alert_email: null,
  visitor_alerts_webhook_enabled: false,
  visitor_alert_webhook_url: null,
  google_ads_conversion_id: null,
  google_ads_conversion_labels: {},
  adsense_publisher_id: null,
  adsense_enabled: false,
  adsense_slot_ids: {},
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("public_site_settings" as never)
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return DEFAULT_SITE_SETTINGS;
  const d = data as Record<string, unknown>;
  return {
    site_title: (d.site_title as string) ?? DEFAULT_SITE_SETTINGS.site_title,
    site_description: (d.site_description as string) ?? DEFAULT_SITE_SETTINGS.site_description,
    github_repo_url: (d.github_repo_url as string | null) ?? null,
    // Alert-related fields are admin-only and not exposed via the public view.
    visitor_alerts_enabled: DEFAULT_SITE_SETTINGS.visitor_alerts_enabled,
    visitor_alerts_in_app: DEFAULT_SITE_SETTINGS.visitor_alerts_in_app,
    visitor_alerts_email_enabled: DEFAULT_SITE_SETTINGS.visitor_alerts_email_enabled,
    visitor_alert_email: DEFAULT_SITE_SETTINGS.visitor_alert_email,
    visitor_alerts_webhook_enabled: DEFAULT_SITE_SETTINGS.visitor_alerts_webhook_enabled,
    visitor_alert_webhook_url: DEFAULT_SITE_SETTINGS.visitor_alert_webhook_url,
  };
}

/**
 * Admin-only: fetch full site_settings row including alert configuration.
 * Requires the caller to have the admin role; otherwise returns defaults.
 */
export async function fetchAdminSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return DEFAULT_SITE_SETTINGS;
  const d = data as Record<string, unknown>;
  return {
    site_title: (d.site_title as string) ?? DEFAULT_SITE_SETTINGS.site_title,
    site_description: (d.site_description as string) ?? DEFAULT_SITE_SETTINGS.site_description,
    github_repo_url: (d.github_repo_url as string | null) ?? null,
    visitor_alerts_enabled: (d.visitor_alerts_enabled as boolean) ?? true,
    visitor_alerts_in_app: (d.visitor_alerts_in_app as boolean) ?? true,
    visitor_alerts_email_enabled: (d.visitor_alerts_email_enabled as boolean) ?? false,
    visitor_alert_email: (d.visitor_alert_email as string | null) ?? null,
    visitor_alerts_webhook_enabled: (d.visitor_alerts_webhook_enabled as boolean) ?? false,
    visitor_alert_webhook_url: (d.visitor_alert_webhook_url as string | null) ?? null,
  };
}

export async function updateSiteSettings(
  patch: Partial<SiteSettings>,
  userId?: string,
): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .update({ ...patch, updated_by: userId ?? null } as never)
    .eq("id", true)
    .select("*")
    .single();
  if (error) throw error;
  const d = data as Record<string, unknown>;
  return {
    site_title: d.site_title as string,
    site_description: d.site_description as string,
    github_repo_url: (d.github_repo_url as string | null) ?? null,
    visitor_alerts_enabled: (d.visitor_alerts_enabled as boolean) ?? true,
    visitor_alerts_in_app: (d.visitor_alerts_in_app as boolean) ?? true,
    visitor_alerts_email_enabled: (d.visitor_alerts_email_enabled as boolean) ?? false,
    visitor_alert_email: (d.visitor_alert_email as string | null) ?? null,
    visitor_alerts_webhook_enabled: (d.visitor_alerts_webhook_enabled as boolean) ?? false,
    visitor_alert_webhook_url: (d.visitor_alert_webhook_url as string | null) ?? null,
  };
}
