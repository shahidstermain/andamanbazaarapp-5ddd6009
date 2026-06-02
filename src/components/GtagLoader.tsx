import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import {
  ensureGtag,
  ensureAdsense,
  isExcludedPath,
  isValidConversionId,
  isValidPublisherId,
} from "@/lib/gtag";

/**
 * Mounts Google Ads (gtag.js) and AdSense once the admin has saved
 * the matching IDs. Also publishes the current settings to a global
 * window slot so the synchronous trackConversion() helper can read
 * them from event handlers without re-querying React context.
 */
export function GtagLoader() {
  const { settings } = useSiteMeta();
  const location = useLocation();

  useEffect(() => {
    (window as unknown as { __abSiteSettings?: typeof settings }).__abSiteSettings = settings;
  }, [settings]);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (isExcludedPath(location.pathname)) return;
    if (isValidConversionId(settings.google_ads_conversion_id)) {
      ensureGtag(settings.google_ads_conversion_id);
    }
    if (settings.adsense_enabled && isValidPublisherId(settings.adsense_publisher_id)) {
      ensureAdsense(settings.adsense_publisher_id);
    }
  }, [
    settings.google_ads_conversion_id,
    settings.adsense_enabled,
    settings.adsense_publisher_id,
    location.pathname,
  ]);

  // Fire a gtag page_view on each in-app navigation so AW reports
  // see real pageviews from the SPA, not just the initial load.
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (isExcludedPath(location.pathname)) return;
    if (!isValidConversionId(settings.google_ads_conversion_id)) return;
    window.gtag?.("event", "page_view", {
      page_path: location.pathname + location.search,
    });
  }, [location.pathname, location.search, settings.google_ads_conversion_id]);

  return null;
}
