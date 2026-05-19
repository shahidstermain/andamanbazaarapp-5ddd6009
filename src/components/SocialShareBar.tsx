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
}

const SITE_URL = "https://andamanbazaar.in";

function resolveUrl(path?: string, baseUrl: string = SITE_URL): string {
  if (path && /^https?:\/\//.test(path)) return path;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const p = path ?? window.location.pathname + window.location.search;
    return new URL(p, origin).toString();
  }
  return new URL(path ?? "/", baseUrl).toString();
}

export function SocialShareBar({
  title,
  description,
  path,
  baseUrl,
  className,
  compact = false,
}: SocialShareBarProps) {
  const { toast } = useToast();
  const shareUrl = resolveUrl(path, baseUrl);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(description ? `${title} — ${description}` : title);

  const links = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: MessageCircle,
      color: "text-[#25D366] hover:bg-[#25D366]/10",
    },
    {
      key: "twitter",
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Twitter,
      color: "text-foreground hover:bg-muted",
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
      color: "text-[#1877F2] hover:bg-[#1877F2]/10",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: Linkedin,
      color: "text-[#0A66C2] hover:bg-[#0A66C2]/10",
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      icon: Send,
      color: "text-[#229ED9] hover:bg-[#229ED9]/10",
    },
  ] as const;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied", description: "Paste it anywhere to share." });
    } catch {
      toast({ title: "Could not copy link", description: shareUrl });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({ title, text: description, url: shareUrl });
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
        Share:
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