UPDATE public.posts
SET content = content || E'\n\n**Kapil - @capturewithmoment** - Andaman-based photographer capturing intimate island moments: golden-hour portraits, beach weddings and street life across Port Blair, Havelock and Neil. [View their work](https://www.instagram.com/capturewithmoment/)\n'
WHERE slug = 'andaman-island-creators-2026'
  AND content NOT LIKE '%capturewithmoment%';