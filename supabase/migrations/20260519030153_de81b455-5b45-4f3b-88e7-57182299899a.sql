UPDATE public.posts
SET content = regexp_replace(
  content,
  E'\\n*> ✍️ \\*A quick note on the shout-outs below:[^\\n]*\\*\\n*',
  E'\n\n',
  'g'
)
WHERE slug = 'port-blair-nightlife-2026';