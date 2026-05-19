// Short-link registry for outreach. Keys are case-insensitive handles
// reachable at `/f/<handle>`. Each entry redirects to either the story
// (with `?as=<handle>` + UTM) or directly to the badge generator.

export type FeaturedTarget = {
  /** Blog post slug the person is featured in. */
  slug: string;
  /** Story title — used to prefill the badge generator. */
  story: string;
  /** Display name for the badge. */
  name: string;
  /** Where the short link should land. Defaults to "story". */
  kind?: "story" | "badge";
};

export const FEATURED_HANDLES: Record<string, FeaturedTarget> = {
  // Andaman Island Creators 2026
  vaishali0517: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Vaishali Devi",
  },
  vishnu_ragasumum: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Vishnu Ragasumum",
  },
  david_andaman: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "David",
  },
  kamal_andaman: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Kamal",
  },
  harman_andaman: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Harman",
  },
  amit_paradkar_: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Amit Paradkar",
  },
  arunvlogger: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Arun",
  },
  rajiv_srivastava: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Rajiv Srivastava",
  },
  blackshade_98: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Blackshade",
  },
  capturewithmoment: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Capture With Moment",
  },
  andamanisletravel: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "Andaman Isle Travel",
  },
  dj_nobody_xo: {
    slug: "andaman-island-creators-2026",
    story: "Andaman Island Creators 2026",
    name: "DJ Nobody XO",
  },

  // Port Blair Nightlife 2026
  drifters_lounge: {
    slug: "port-blair-nightlife-2026",
    story: "Port Blair after dark: where the parties actually are",
    name: "Pushkar — Drifters Lounge",
  },
  junglee_mirchi: {
    slug: "port-blair-nightlife-2026",
    story: "Port Blair after dark: where the parties actually are",
    name: "Vishnu — Junglee Mirchi",
  },
  amaya_lounge: {
    slug: "port-blair-nightlife-2026",
    story: "Port Blair after dark: where the parties actually are",
    name: "Amaya Lounge",
  },
  luxx_pub: {
    slug: "port-blair-nightlife-2026",
    story: "Port Blair after dark: where the parties actually are",
    name: "Luxx Pub & Lounge",
  },
  love_garden: {
    slug: "port-blair-nightlife-2026",
    story: "Port Blair after dark: where the parties actually are",
    name: "Love Garden — Hotel Shompen",
  },
};

export function lookupFeaturedHandle(handle: string): FeaturedTarget | null {
  const key = handle.trim().toLowerCase().replace(/^@/, "");
  return FEATURED_HANDLES[key] ?? null;
}