-- Google Ads conversion tracking + AdSense settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS google_ads_conversion_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS adsense_publisher_id TEXT,
  ADD COLUMN IF NOT EXISTS adsense_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adsense_slot_ids JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Recreate the public view to expose the ad-related fields needed by the client
-- (these are not secrets — they ship in HTML to every visitor anyway).
DROP VIEW IF EXISTS public.public_site_settings;
CREATE VIEW public.public_site_settings AS
SELECT
  id,
  site_title,
  site_description,
  github_repo_url,
  google_ads_conversion_id,
  google_ads_conversion_labels,
  adsense_publisher_id,
  adsense_enabled,
  adsense_slot_ids
FROM public.site_settings;

ALTER VIEW public.public_site_settings OWNER TO postgres;
GRANT SELECT ON public.public_site_settings TO anon, authenticated;