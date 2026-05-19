UPDATE public.posts
SET content = regexp_replace(
  content,
  E'\\*\\*Kapil\\*\\* \\(\\[@capturewithmoment\\]\\(https://www\\.instagram\\.com/capturewithmoment/\\)\\) has built one of the most respected photography pages.*?\\[→ View their work\\]\\(https://www\\.instagram\\.com/capturewithmoment/\\)',
  E'**Kapil** ([@capturewithmoment](https://www.instagram.com/capturewithmoment/)) has built one of the most respected photography pages in the islands almost entirely through discipline - posting on time, almost every week, with work that stays focused: golden-hour portraits on Corbyn''s Cove, intimate beach weddings on Havelock and quiet street frames from Aberdeen Bazaar.\n\nWhat makes his feed matter is what it has done to the local scene. His clean editing - balanced skin tones, restrained contrast, never the over-saturated "Andaman blue" filter - and his willingness to share behind-the-scenes setups have quietly pushed a generation of young islanders to pick up a camera. [→ View their work](https://www.instagram.com/capturewithmoment/)',
  'g'
)
WHERE slug = 'andaman-island-creators-2026';

UPDATE public.posts
SET content = replace(
  content,
  '- **PhotoBible** ([@PhotoBible](https://www.instagram.com/photobible/)) - one of the most consistent island-photography handles on Instagram, PhotoBible has become an unofficial visual diary of the Andamans. The feed moves between fishing boats at first light, jetty silhouettes, monsoon clouds rolling over Aberdeen Bay, quiet street frames from Port Blair lanes and clean wide-angle takes of Radhanagar and Kalapathar. What makes the page stand out is restraint - clean compositions, honest colours, no over-processing - which has made it a reference point for newer island shooters learning how to frame their own home. [→ View their work](https://www.instagram.com/photobible/)',
  '- **PhotoBible** ([@PhotoBible](https://www.instagram.com/photobible/)) - an unofficial visual diary of the Andamans: fishing boats at first light, jetty silhouettes, monsoon clouds over Aberdeen Bay and clean wide-angle frames of Radhanagar. Restrained, honestly-coloured work that newer island shooters use as a reference. [→ View their work](https://www.instagram.com/photobible/)'
)
WHERE slug = 'andaman-island-creators-2026';