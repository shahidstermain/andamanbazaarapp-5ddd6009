// Island-based content creators, photographers, drone pilots, dive teams and
// local media platforms profiled in our editorial coverage. Sources are linked
// in `referenceUrl` so the directory stays verifiable.

export type CreatorTag =
  | "photographer"
  | "drone"
  | "dj"
  | "travel-media"
  | "dive"
  | "news"
  | "studio"
  | "video";

export const TAG_LABEL: Record<CreatorTag, string> = {
  photographer: "Photographer",
  drone: "Drone",
  dj: "DJ / Music",
  "travel-media": "Travel media",
  dive: "Diver / Underwater",
  news: "Local news",
  studio: "Photo studio",
  video: "Videographer",
};

export type IslandCreator = {
  /** stable id used in URLs and search */
  id: string;
  /** display name */
  name: string;
  /** @handle or brand short label */
  handle?: string;
  /** one-line description shown in cards */
  blurb: string;
  /** which island / area they are based in */
  base: string;
  tags: CreatorTag[];
  /** primary public profile (Instagram, Threads, website) */
  profileUrl: string;
  /** publishable reference (article, press, our own story) */
  referenceUrl?: string;
  referenceLabel?: string;
  /** if we feature them in one of our stories, link back to it */
  storySlug?: string;
};

const STORY = "andaman-island-creators-2026";

export const islandCreators: IslandCreator[] = [
  // ── Already profiled in our cover story ────────────────────────────────
  {
    id: "vaishali-devi",
    name: "Vaishali Devi",
    handle: "@vaishali0517",
    blurb:
      "Tushnabad-born travel photographer recognised by Andaman Tourism, IPNT, PBMC, ANTO and featured on Doordarshan.",
    base: "Tushnabad, South Andaman",
    tags: ["photographer"],
    profileUrl: "https://www.instagram.com/vaishali0517",
    referenceUrl:
      "https://thewaveandaman.com/vaishali-andaman-travel-photographer-story/",
    referenceLabel: "The Wave Andaman profile",
    storySlug: STORY,
  },
  {
    id: "vishnu-ragasumum",
    name: "Vishnu Ragasumum",
    blurb:
      "Freelance drone pilot whose viral plastic-waste reel on Andaman beaches was picked up by MSN and national outlets.",
    base: "Sri Vijay Puram (Port Blair)",
    tags: ["drone", "video"],
    profileUrl: "https://andamansheekha.com/150853/",
    referenceUrl: "https://andamansheekha.com/150853/",
    referenceLabel: "Andaman Sheekha report",
    storySlug: STORY,
  },
  {
    id: "dj-nobody-xo",
    name: "Shiv Kumar (dj_nobody_xo)",
    handle: "@dj_nobody_xo",
    blurb:
      "Music-led reels — Radhanagar sunsets, Havelock tide pools, Port Blair monsoon skies, Neil Cove blues.",
    base: "Andaman",
    tags: ["dj", "video", "photographer"],
    profileUrl: "https://www.instagram.com/dj_nobody_xo/",
    storySlug: STORY,
  },
  {
    id: "arshad-rehman",
    name: "Arshad Rehman",
    handle: "@blackshade_98",
    blurb:
      "Quiet, nature-led photography from places most travellers never reach — Trinket, Kamorta, Nancowry.",
    base: "Andamans",
    tags: ["photographer"],
    profileUrl: "https://www.threads.net/@blackshade_98",
    storySlug: STORY,
  },
  {
    id: "andaman-drone-art",
    name: "Andaman Drone Art",
    blurb:
      "Island-based drone portfolio cataloguing shipwrecks, mudflats and coastlines (e.g. Blind Bight boatwreck, Victoria).",
    base: "Andaman",
    tags: ["drone", "studio"],
    profileUrl: "https://andamandroneart.com/",
    referenceUrl:
      "https://andamandroneart.com/portfolio/blind-bright-boatwreck/",
    referenceLabel: "Blind Bight portfolio",
    storySlug: STORY,
  },
  {
    id: "the-wave-andaman",
    name: "The Wave Andaman",
    handle: "@thewave.andaman",
    blurb:
      "Independent island-run news platform giving local creators the long-form profiles mainland media usually skip.",
    base: "Andaman & Nicobar",
    tags: ["news", "travel-media"],
    profileUrl: "https://www.instagram.com/thewave.andaman/",
    referenceUrl: "https://thewaveandaman.com/",
    referenceLabel: "thewaveandaman.com",
    storySlug: STORY,
  },
  {
    id: "experience-andamans",
    name: "Experience Andamans",
    handle: "@experienceandamans",
    blurb:
      "10+ year old local DMC with Gold Level Recognition by Andaman Tourism and multi-year Tripadvisor Travellers' Choice wins.",
    base: "Port Blair",
    tags: ["travel-media", "studio"],
    profileUrl: "https://www.instagram.com/experienceandamans/",
    referenceUrl: "https://www.experienceandamans.com/about-us",
    referenceLabel: "About Experience Andamans",
    storySlug: STORY,
  },
  {
    id: "go2andaman",
    name: "Go2Andaman",
    handle: "@go2andaman",
    blurb:
      "Independent local travel platform operating in Port Blair since 2008 — ferries, experiences and honest planning.",
    base: "Port Blair",
    tags: ["travel-media"],
    profileUrl: "https://www.threads.com/@go2andaman",
    referenceUrl: "https://go2andaman.com/",
    referenceLabel: "go2andaman.com",
    storySlug: STORY,
  },
  {
    id: "andaman-travel-guide",
    name: "The Andaman Travel Guide",
    handle: "@andaman_travelguide",
    blurb:
      "Blogger-style coverage of beaches, islands and offbeat ferry routes like Aerial Bay → Ross & Smith.",
    base: "Andaman",
    tags: ["travel-media"],
    profileUrl: "https://www.threads.com/@andaman_travelguide",
    storySlug: STORY,
  },
  {
    id: "andaman-wala",
    name: "Andaman Wala",
    blurb:
      "Local destination management company curating island tours, ferries and experiences with a Port Blair team.",
    base: "Port Blair",
    tags: ["travel-media"],
    profileUrl: "https://andamanwala.com/",
    storySlug: STORY,
  },

  // ── New additions (Round 2) ────────────────────────────────────────────
  {
    id: "maiylpalli-david-raj",
    name: "Maiylpalli David Raj",
    handle: "@capturedby_david",
    blurb:
      "Documents offbeat island life — Shoal Bay, untouched beaches, fishing villages — and runs Andaman Isle Travel.",
    base: "Andaman",
    tags: ["photographer", "travel-media"],
    profileUrl: "https://www.instagram.com/capturedby_david/",
    referenceUrl: "https://www.threads.com/@andamanisletravel",
    referenceLabel: "Andaman Isle Travel",
  },
  {
    id: "rajiv-srivastava",
    name: "Rajiv Srivastava",
    handle: "@rajiv_srivastava",
    blurb:
      "Travel photographer commissioned by the Government of Andaman Tourism, known for his Ross & Smith Island work.",
    base: "Andaman",
    tags: ["photographer"],
    profileUrl: "https://www.instagram.com/rajiv_srivastava/",
    referenceUrl:
      "https://www.instagram.com/rajiv_srivastava/p/DFaCyoySEeV/",
    referenceLabel: "Andaman Tourism commission post",
  },
  {
    id: "kamal-sahoo",
    name: "Kamal Sahoo",
    handle: "@through_kamals_lens",
    blurb:
      "Nikon shooter behind Katha Chitraka — long-running Radhanagar / Swaraj Dweep sunset and silhouette work.",
    base: "Andaman",
    tags: ["photographer"],
    profileUrl: "https://www.instagram.com/through_kamals_lens/",
    referenceUrl: "https://www.instagram.com/through_kamals_lens/p/C5vvOw9tJCv/",
    referenceLabel: "Swaraj Dweep sunset series",
  },
  {
    id: "sujay-jain",
    name: "Sujay Jain",
    blurb:
      "Travel photographer with a dedicated Andaman & Nicobar Islands gallery on his portfolio site.",
    base: "Visiting / India",
    tags: ["photographer"],
    profileUrl: "https://www.sujayphotography.com/new-page",
    referenceUrl: "https://www.sujayphotography.com/new-page",
    referenceLabel: "Andaman gallery",
  },
  {
    id: "amit-paradkar",
    name: "Amit Paradkar",
    handle: "@amit_paradkar_",
    blurb:
      "PADI Master Scuba Diver Trainer based in Havelock — underwater content including Barren Island lava-rock dives.",
    base: "Havelock Island",
    tags: ["dive", "video"],
    profileUrl: "https://www.threads.com/@amit_paradkar_",
  },
  {
    id: "shutterboat",
    name: "ShutterBoat Photography",
    blurb:
      "Havelock-based destination photography studio for beach proposals, weddings and family portraits.",
    base: "Havelock Island",
    tags: ["studio", "photographer"],
    profileUrl: "https://www.shutterboat.com/",
  },
  {
    id: "readyforshoot",
    name: "ReadyForShoot",
    blurb:
      "Network of professional vacation photographers across Port Blair and Havelock for travellers and brands.",
    base: "Port Blair · Havelock",
    tags: ["studio", "photographer"],
    profileUrl: "https://www.readyforshoot.com/",
  },
  {
    id: "candid-corporation",
    name: "Candid Corporation",
    blurb:
      "Destination wedding photographers in the Andamans — solo, couple, candlelight-dinner and family shoots.",
    base: "Andaman",
    tags: ["studio", "photographer", "video"],
    profileUrl: "https://www.candidcorporation.com/about.html",
  },
  {
    id: "andaman-sheekha",
    name: "Andaman Sheekha",
    blurb:
      "Long-running independent Andaman news outlet whose reporting often amplifies local-creator stories nationally.",
    base: "Sri Vijaya Puram",
    tags: ["news"],
    profileUrl: "https://andamansheekha.com/",
    referenceUrl: "https://andamansheekha.com/150853/",
    referenceLabel: "Coverage of Vishnu Ragasumum's viral reel",
  },
  {
    id: "andaman-isle-travel",
    name: "Andaman Isle Travel",
    handle: "@andamanisletravel",
    blurb:
      "Local agency curating island deals — visual content shot by @capturedby_david, 6,000+ guests served.",
    base: "Andaman",
    tags: ["travel-media"],
    profileUrl: "https://www.threads.com/@andamanisletravel",
    referenceUrl: "https://andamanisletravel.com/",
    referenceLabel: "andamanisletravel.com",
  },
  {
    id: "frogman-adventures",
    name: "Frogman Adventures",
    blurb:
      "Havelock dive school producing steady underwater content — Red Pillar, White House Rock, The Slope and more.",
    base: "Havelock Island",
    tags: ["dive", "studio"],
    profileUrl: "https://www.frogman.in/",
  },
  {
    id: "diveindia",
    name: "DIVEIndia",
    blurb:
      "The Andamans' first and leading dive centre — long-form underwater storytelling from Havelock and Neil.",
    base: "Havelock · Neil",
    tags: ["dive", "studio"],
    profileUrl: "https://diveindia.com/",
  },
  {
    id: "aqua-andaman",
    name: "Aqua Andaman",
    blurb:
      "Local tour operator producing island-hopping visual content across Havelock, Neil and Ross.",
    base: "Port Blair",
    tags: ["travel-media"],
    profileUrl: "https://aquaandaman.com/",
  },
  {
    id: "divemaster-havelock",
    name: "The Divemaster Havelock",
    blurb:
      "PADI-certified Havelock dive operator with regularly published dive-site reels and 2,800+ reviews online.",
    base: "Havelock Island",
    tags: ["dive", "studio"],
    profileUrl: "https://thedivemasterhavelock.com/best-scuba-diving-in-havelock-island-andaman/",
  },
  {
    id: "andaman-diaries",
    name: "Andaman Diaries",
    blurb:
      "Island-based travel agency with steady social content on packages, ferries and snorkelling spots.",
    base: "Port Blair",
    tags: ["travel-media"],
    profileUrl: "https://www.andamandiaries.com/",
    storySlug: STORY,
  },
];

export const ALL_TAGS: CreatorTag[] = [
  "photographer",
  "drone",
  "dj",
  "travel-media",
  "dive",
  "news",
  "studio",
  "video",
];