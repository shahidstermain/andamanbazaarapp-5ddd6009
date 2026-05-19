
DROP POLICY IF EXISTS "Public can read active vendors (safe columns via view)" ON public.affiliate_vendors;
DROP POLICY IF EXISTS "Public can read site_settings (safe columns via view)" ON public.site_settings;

-- Switch the views back to SECURITY DEFINER mode (default) so they bypass table RLS
-- and only expose the safe columns we selected. The view owner (postgres) has full access.
ALTER VIEW public.public_affiliate_vendors SET (security_invoker = false);
ALTER VIEW public.public_site_settings SET (security_invoker = false);
