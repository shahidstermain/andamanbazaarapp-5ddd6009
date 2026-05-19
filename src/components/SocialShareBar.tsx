import { Facebook, Linkedin, Link2, MessageCircle, Send, Share2, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SocialShareBarProps {
  /** Page title — used as the share text on networks that accept it. */
  title: string;
  /** Optional short description (used by native share + Twitter text). */
  description?: string;
  /** Path relative to the site origin (e.g. "/blog/my-post"). Falls back to current location. */
  path?: string;
  /** Override the absolute base URL. Defaults to the deployed domain. */
  baseUrl?: string;
  className?: string;
  /** Compact icon-only variant. */
  compact?: boolean;
  /** Featured-person handle. When set, all share links are tagged with utm_source=<handle>. */
  utmSource?: string;
  /** Optional campaign label (defaults to "featured-share"). */
  utmCampaign?: string;
  /**
   * When set, social network buttons share via the server-rendered
   * /share endpoint so WhatsApp / Facebook / LinkedIn / iMessage / Slack
   * see per-target og:* tags instead of the generic site card.
   * "blog" → shareId is the post slug. "listing" → shareId is the listing UUID.
   */
  shareKind?: "blog" | "listing";
  shareId?: string;
}

const SITE_URL = "https://andamanbazaar.in";
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const SHARE_BASE = SUPABASE_PROJECT_ID
  ? `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/share`
  : null;

/**
 * URL that social-network crawlers will fetch. Returns a server-rendered
 * page with per-target og:* tags that redirects humans to the canonical
 * page. Falls back to the canonical URL when the share kind is unknown.
 */
function buildPreviewUrl(canonical: string, shareKind?: "blog" | "listing", shareId?: string): string {
  if (!SHARE_BASE || !shareKind || !shareId) return canonical;
  // Pass through query string (utm + ?as=) so the redirect preserves attribution.
  let query = "";
  try {
    const u = new URL(canonical);
    query = u.search;
  } catch {
    /* ignore */
  }
  return `${SHARE_BASE}/${shareKind}/${encodeURIComponent(shareId)}${query}`;
}

function resolveUrl(path?: string, baseUrl: string = SITE_URL): string {
  if (path && /^https?:\/\//.test(path)) return path;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const p = path ?? window.location.pathname + window.location.search;
    return new URL(p, origin).toString();
  }
  return new URL(path ?? "/", baseUrl).toString();
}

function withUtm(
  url: string,
  network: string,
  utmSource?: string,
  utmCampaign: string = "featured-share",
): string {
  try {
    const u = new URL(url);
    // Strip any pre-existing 'as' helper param so it never leaks into shared links.
    u.searchParams.delete("as");
    u.searchParams.set("utm_source", utmSource || network);
    u.searchParams.set("utm_medium", utmSource ? "social" : network);
    u.searchParams.set("utm_campaign", utmCampaign);
    if (utmSource) u.searchParams.set("utm_content", network);
    return u.toString();
  } catch {
    return url;
  }
}

export function SocialShareBar({
  title,
  description,
  path,
  baseUrl,
  className,
  compact = false,
  utmSource,
  utmCampaign,
  shareKind,
  shareId,
}: SocialShareBarProps) {
  const { toast } = useToast();
  const baseShareUrl = resolveUrl(path, baseUrl);
  // URL used for "Copy link" / native share — keep utm_source as the handle (or "direct").
  const copyUrl = withUtm(baseShareUrl, "copy", utmSource, utmCampaign);
  const encodedTitle = encodeURIComponent(title);
  const shareText = description ? `${title} — ${description}` : title;

  // Networks that fetch URL previews server-side (no JS) get the /share
  // endpoint so they see per-target og:* tags. Networks that render JS
  // previews (Twitter, Telegram) can use the canonical URL directly.
  const previewableFor = (network: string) => {
    const canonical = withUtm(baseShareUrl, network, utmSource, utmCampaign);
    return buildPreviewUrl(canonical, shareKind, shareId);
  };
  const urlFor = (network: string) => encodeURIComponent(previewableFor(network));
  const textFor = (network: string) =>
    encodeURIComponent(`${shareText} ${previewableFor(network)}`);

  const links = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${textFor("whatsapp")}`,
      icon: MessageCircle,
      color: "text-[#25D366] hover:bg-[#25D366]/10",
    },
    {
      key: "twitter",
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?url=${urlFor("twitter")}&text=${encodedTitle}`,
      icon: Twitter,
      color: "text-foreground hover:bg-muted",
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${urlFor("facebook")}`,
      icon: Facebook,
      color: "text-[#1877F2] hover:bg-[#1877F2]/10",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${urlFor("linkedin")}`,
      icon: Linkedin,
      color: "text-[#0A66C2] hover:bg-[#0A66C2]/10",
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${urlFor("telegram")}&text=${encodedTitle}`,
      icon: Send,
      color: "text-[#229ED9] hover:bg-[#229ED9]/10",
    },
  ] as const;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyUrl);
      toast({ title: "Link copied", description: "Paste it anywhere to share." });
    } catch {
      toast({ title: "Could not copy link", description: copyUrl });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({ title, text: description, url: copyUrl });
    } catch {
      /* user dismissed */
    }
  };

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2",
        className,
      )}
      aria-label="Share this story"
    >
      <span className="mr-1 hidden text-xs font-medium text-muted-foreground sm:inline">
        {utmSource ? `Sharing as @${utmSource}:` : "Share:"}
      </span>

      {links.map(({ key, label, href, icon: Icon, color }) => (
        <Button
          key={key}
          asChild
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 rounded-full", color)}
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${label}`}
            title={`Share on ${label}`}
          >
            <Icon className="h-4 w-4" />
          </a>
        </Button>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
        onClick={handleCopy}
        aria-label="Copy link"
        title="Copy link"
      >
        <Link2 className="h-4 w-4" />
      </Button>

      {canNativeShare && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted sm:hidden"
          onClick={handleNativeShare}
          aria-label="More share options"
          title="More share options"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      )}

      {compact ? null : null}
    </div>
  );
}

export default SocialShareBar;