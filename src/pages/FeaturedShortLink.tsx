import { useEffect, useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { lookupFeaturedHandle } from "@/data/featuredHandles";

/**
 * Short outreach link: `/f/:handle` → redirects to the story (or badge)
 * with UTM tags + the `?as=` helper param wired up. Keeps DM-safe URLs
 * (no spaces, no long query strings) so Instagram/WhatsApp auto-link
 * them cleanly.
 *
 * Query overrides:
 *  - `?to=badge` forces the badge generator instead of the story.
 *  - `?to=story` (default) lands on the blog post.
 */
export default function FeaturedShortLink() {
  const { handle = "" } = useParams();
  const [search] = useSearchParams();
  const target = useMemo(() => lookupFeaturedHandle(handle), [handle]);

  const dest = useMemo(() => {
    if (!target) return null;
    const cleanHandle = handle.trim().toLowerCase().replace(/^@/, "");
    const mode = search.get("to") === "badge" ? "badge" : "story";

    if (mode === "badge") {
      const params = new URLSearchParams({
        slug: target.slug,
        story: target.story,
        handle: cleanHandle,
        name: target.name,
      });
      return `/badge?${params.toString()}`;
    }

    const params = new URLSearchParams({
      as: cleanHandle,
      utm_source: cleanHandle,
      utm_medium: "social",
      utm_campaign: "featured-outreach",
    });
    return `/blog/${target.slug}?${params.toString()}`;
  }, [handle, target, search]);

  useEffect(() => {
    if (dest) {
      // Replace history so back-button skips the redirect hop.
      window.history.replaceState(null, "", dest);
    }
  }, [dest]);

  if (!target || !dest) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <p className="text-sm">Opening your story…</p>
      <Navigate to={dest} replace />
    </div>
  );
}