-- Clean up auto-generated blog/news posts:
-- 1. Strip the leading markdown cover image that duplicates the page hero.
-- 2. Fix the one DSS weather post that has Cyrillic LLM bleed + code fences.

UPDATE public.posts
SET content = regexp_replace(content, '^!\[[^\]]*\]\([^)]+\)\s*\n+', ''),
    updated_at = now()
WHERE content ~ '^!\[';

-- Targeted clean-up for the post that came out wrapped in ``` and prefixed
-- with a Russian preamble. Keep only the English body inside the fence.
UPDATE public.posts
SET content = trim(both E' \n' FROM
  regexp_replace(
    regexp_replace(
      regexp_replace(content, '^[\s\S]*?```[a-zA-Z]*\s*\n', ''),
      '\n?```\s*$', ''
    ),
    '[\u0400-\u04FF]+', '', 'g'
  )
),
    updated_at = now()
WHERE slug = 'adverse-weather-may-disrupt-andaman-nicobar-ship-and-ferry-services-dss';