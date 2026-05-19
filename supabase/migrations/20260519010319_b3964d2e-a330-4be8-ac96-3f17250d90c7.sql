
ALTER VIEW public.public_affiliate_vendors SET (security_invoker = true);
ALTER VIEW public.public_site_settings SET (security_invoker = true);

-- Add a permissive read policy on affiliate_vendors so security_invoker views work for anon/authenticated.
-- (Admin SELECT policy already exists; we add a row-filtered policy that exposes the same active-only rows
-- as the old policy, but only the safe columns will be reachable through the view.)
CREATE POLICY "Public can read active vendors (safe columns via view)"
ON public.affiliate_vendors FOR SELECT
USING (active = true);

-- And same for site_settings: allow anyone to read the singleton row so the public view works.
CREATE POLICY "Public can read site_settings (safe columns via view)"
ON public.site_settings FOR SELECT
USING (true);
