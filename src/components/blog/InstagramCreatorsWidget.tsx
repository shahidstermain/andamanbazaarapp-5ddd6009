import { useEffect, useRef } from "react";
import { Instagram } from "lucide-react";

// Specific public Instagram posts we have permission-friendly references for.
// These render as official Instagram blockquote embeds via embed.js.
const FEATURED_POSTS: { url: string; caption: string }[] = [
  {
    url: "https://www.instagram.com/rajiv_srivastava/p/DFaCyoySEeV/",
    caption: "Rajiv Srivastava — commissioned by Andaman Tourism",
  },
  {
    url: "https://www.instagram.com/through_kamals_lens/p/C5vvOw9tJCv/",
    caption: "Kamal Sahoo — Swaraj Dweep sunset silhouette",
  },
  {
    url: "https://www.instagram.com/travelinstylewithharman/reel/C5lMjzyJKjg/",
    caption: "Harmanpreet Kaur Sandhu — Neil Island marine trail",
  },
];

// Profile-only handles we mention in the story. IG no longer supports profile
// embedding for non-business accounts, so we render them as branded link cards.
const PROFILE_HANDLES: { handle: string; name: string; url: string }[] = [
  { handle: "@vaishali0517", name: "Vaishali Devi", url: "https://www.instagram.com/vaishali0517/" },
  { handle: "@vishnu_ragasumum", name: "Vishnu Ragasumum", url: "https://www.instagram.com/vishnu_ragasumum/" },
  { handle: "@dj_nobody_xo", name: "Shiv Kumar", url: "https://www.instagram.com/dj_nobody_xo/" },
  { handle: "@capturedby_david", name: "Maiylpalli David Raj", url: "https://www.instagram.com/capturedby_david/" },
  { handle: "@blackshade_98", name: "Arshad Rehman", url: "https://www.instagram.com/blackshade_98/" },
  { handle: "@thewave.andaman", name: "The Wave Andaman", url: "https://www.instagram.com/thewave.andaman/" },
  { handle: "@experienceandamans", name: "Experience Andamans", url: "https://www.instagram.com/experienceandamans/" },
  { handle: "@PhotoBible", name: "PhotoBible", url: "https://www.instagram.com/photobible/" },
];

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

function loadEmbedScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.instagram.com/embed.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => {
        window.instgrm?.Embeds.process();
        resolve();
      });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://www.instagram.com/embed.js";
    s.async = true;
    s.onload = () => {
      window.instgrm?.Embeds.process();
      resolve();
    };
    document.body.appendChild(s);
  });
}

export function InstagramCreatorsWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadEmbedScript();
    // Re-process when the component mounts in case the script was already cached.
    const id = window.setTimeout(() => window.instgrm?.Embeds.process(), 600);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section
      ref={containerRef}
      className="my-10 space-y-5 rounded-2xl border border-border bg-card/40 p-5 shadow-[var(--shadow-card)]"
      aria-labelledby="ig-creators-widget"
    >
      <header className="flex items-center gap-2">
        <Instagram className="h-5 w-5 text-primary" aria-hidden />
        <h2 id="ig-creators-widget" className="text-lg font-semibold tracking-tight">
          A peek at their feeds
        </h2>
      </header>
      <p className="text-sm text-muted-foreground">
        Live Instagram previews from creators featured above. Tap any embed to open
        it in Instagram.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_POSTS.map((p) => (
          <figure
            key={p.url}
            className="overflow-hidden rounded-xl border border-border bg-background"
          >
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={p.url}
              data-instgrm-version="14"
              style={{
                background: "transparent",
                border: 0,
                margin: 0,
                padding: 0,
                minWidth: "100%",
              }}
            >
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                {p.caption}
              </a>
            </blockquote>
            <figcaption className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {p.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Follow more island creators
        </h3>
        <ul className="flex flex-wrap gap-2">
          {PROFILE_HANDLES.map((c) => (
            <li key={c.url}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Instagram className="h-3.5 w-3.5" aria-hidden />
                <span className="font-semibold">{c.name}</span>
                <span className="text-muted-foreground">{c.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}