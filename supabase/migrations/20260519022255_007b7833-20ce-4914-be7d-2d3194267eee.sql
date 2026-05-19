UPDATE public.posts
SET content = regexp_replace(
  content,
  '(## The island media platforms)',
  E'## More handles worth following\n\nA few more island-led (or island-focused) creators readers have flagged to us:\n\n- **PhotoBible** ([@PhotoBible](https://www.instagram.com/photobible/)) - island photography handle archiving sunrise-to-sunset frames from across the Andamans: boats, beaches, monsoon skies and street life. [→ View their work](https://www.instagram.com/photobible/)\n- **Andaman Studio** ([andaman.studio](https://andaman.studio/)) - Havelock-based shoot team covering beach proposals, candle-light dinners, cinematic drone reels and pre/post wedding sessions. [→ View their work](https://andaman.studio/)\n- **Arun Vlogger** ([@arunvlogger](https://www.youtube.com/@ArunVlogger)) - cinematic travel-vlogger whose Havelock dive and drone episodes have been syndicated on Tripoto and YouTube. [→ View their work](https://www.youtube.com/@ArunVlogger)\n- **Harmanpreet Kaur Sandhu** ([@travelinstylewithharman](https://www.instagram.com/travelinstylewithharman/)) - long-form travel creator with detailed **Neil Island** marine-trail reels and Andaman island guides. [→ View their work](https://www.instagram.com/travelinstylewithharman/)\n\n\\1',
  'n'
),
updated_at = now()
WHERE slug = 'andaman-island-creators-2026'
  AND content NOT LIKE '%More handles worth following%';