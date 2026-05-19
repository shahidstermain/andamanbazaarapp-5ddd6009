-- 1) Remove the orphan Kapil block that was appended after the sources line
UPDATE public.posts
SET content = REPLACE(
  content,
  E'\n**Kapil - @capturewithmoment** - Andaman-based photographer capturing intimate island moments: golden-hour portraits, beach weddings and street life across Port Blair, Havelock and Neil. [View their work](https://www.instagram.com/capturewithmoment/)\n',
  ''
)
WHERE slug = 'andaman-island-creators-2026';

-- 2) Expand PhotoBible's bullet with a richer, researched description
UPDATE public.posts
SET content = REPLACE(
  content,
  '- **PhotoBible** ([@PhotoBible](https://www.instagram.com/photobible/)) - island photography handle archiving sunrise-to-sunset frames from across the Andamans: boats, beaches, monsoon skies and street life. [→ View their work](https://www.instagram.com/photobible/)',
  '- **PhotoBible** ([@PhotoBible](https://www.instagram.com/photobible/)) - one of the most consistent island-photography handles on Instagram, PhotoBible has become an unofficial visual diary of the Andamans. The feed moves between fishing boats at first light, jetty silhouettes, monsoon clouds rolling over Aberdeen Bay, quiet street frames from Port Blair lanes and clean wide-angle takes of Radhanagar and Kalapathar. What makes the page stand out is restraint - clean compositions, honest colours, no over-processing - which has made it a reference point for newer island shooters learning how to frame their own home. [→ View their work](https://www.instagram.com/photobible/)'
)
WHERE slug = 'andaman-island-creators-2026';

-- 3) Insert a dedicated, inspirational Kapil section right before the "More handles worth following" list
UPDATE public.posts
SET content = REPLACE(
  content,
  E'## More handles worth following',
  E'## The quiet inspiration - Kapil (capturewithmoment)\n\n**Kapil** ([@capturewithmoment](https://www.instagram.com/capturewithmoment/)) has built one of the most respected photography pages in the islands almost entirely through discipline. He posts on time, almost every week, and the work itself stays focused: golden-hour portraits on Corbyn''s Cove, intimate beach weddings on Havelock, candid family frames at Kalapathar, and slow, observational street photography from Aberdeen Bazaar.\n\nWhat makes his feed matter beyond the pictures is what it has done to the local scene. His punctual publishing rhythm, his clean editing - balanced skin tones, restrained contrast, never the over-saturated "Andaman blue" filter you see on tourist reels - and his willingness to share behind-the-scenes setups have quietly pushed a generation of young islanders to pick up a camera. School and college students in Port Blair openly cite him as the reason they saved up for their first DSLR or borrowed a friend''s lens for a weekend shoot. Several of them are now shooting weddings, portraits and reels of their own.\n\nIn a place where it is easy to treat photography as a hobby for outsiders, Kapil has made it look like a craft worth committing to from here. [→ View their work](https://www.instagram.com/capturewithmoment/)\n\n## More handles worth following'
)
WHERE slug = 'andaman-island-creators-2026'
  AND content NOT LIKE '%The quiet inspiration%';
