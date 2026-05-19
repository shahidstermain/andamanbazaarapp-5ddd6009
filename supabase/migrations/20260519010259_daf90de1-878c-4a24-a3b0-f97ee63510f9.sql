
-- 1. affiliate_vendors: restrict SELECT to admins; add safe public view
DROP POLICY IF EXISTS "Anyone can view active vendors" ON public.affiliate_vendors;

CREATE OR REPLACE VIEW public.public_affiliate_vendors
WITH (security_invoker = true) AS
SELECT id, name, slug, category, description, homepage_url, logo_url,
       priority, active, trusted, disclosure_text,
       commission_type, commission_value, affiliate_url_template,
       created_at, updated_at
FROM public.affiliate_vendors
WHERE active = true;

GRANT SELECT ON public.public_affiliate_vendors TO anon, authenticated;

-- The view uses security_invoker, so it needs a permissive policy on the underlying table.
-- We add a column-safe read policy by allowing SELECT on the table when querying via view is not possible.
-- Instead, recreate the view as SECURITY DEFINER style: drop and recreate without security_invoker
DROP VIEW public.public_affiliate_vendors;
CREATE VIEW public.public_affiliate_vendors AS
SELECT id, name, slug, category, description, homepage_url, logo_url,
       priority, active, trusted, disclosure_text,
       commission_type, commission_value, affiliate_url_template,
       created_at, updated_at
FROM public.affiliate_vendors
WHERE active = true;

ALTER VIEW public.public_affiliate_vendors OWNER TO postgres;
GRANT SELECT ON public.public_affiliate_vendors TO anon, authenticated;

-- 2. site_settings: restrict SELECT to admins, expose public-safe view
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

CREATE POLICY "Admins can view site settings"
ON public.site_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.public_site_settings AS
SELECT id, site_title, site_description, github_repo_url, updated_at
FROM public.site_settings;

ALTER VIEW public.public_site_settings OWNER TO postgres;
GRANT SELECT ON public.public_site_settings TO anon, authenticated;

-- 3. Revoke EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_publish_alert_secret() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_affiliate_conversion(uuid, uuid, uuid, text, integer, integer, text, jsonb) FROM anon, authenticated, PUBLIC;
