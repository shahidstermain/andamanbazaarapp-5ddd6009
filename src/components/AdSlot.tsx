import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSiteMeta } from "@/hooks/useSiteMeta";
import { isExcludedPath, isValidPublisherId } from "@/lib/gtag";

type Props = {
  /**
   * Key into `site_settings.adsense_slot_ids` (set by an admin), e.g.
   * `blog_in_article`, `blog_index_grid`, `listings_grid`.
   */
  slot: string;
  /** AdSense ad format. Defaults to responsive "auto". */
  format?: "auto" | "fluid" | "rectangle";
  /** Tailwind classes for the wrapping <ins> container. */
  className?: string;
  /** Optional aria/test label so the placeholder is identifiable. */
  label?: string;
};

/**
 * AdSense slot. Renders nothing until:
 * - admin enabled adsense AND saved a valid publisher id
 * - admin saved a slot id for this `slot` key
 * - the current route is not excluded (admin, auth callbacks, etc.)
 */
export function AdSlot({ slot, format = "auto", className, label }: Props) {
  const { settings } = useSiteMeta();
  const location = useLocation();
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  const publisherId = settings.adsense_publisher_id;
  const slotId = settings.adsense_slot_ids?.[slot];
  const enabled =
    !import.meta.env.DEV &&
    settings.adsense_enabled &&
    isValidPublisherId(publisherId) &&
    !!slotId &&
    !isExcludedPath(location.pathname);

  useEffect(() => {
    if (!enabled || pushed.current) return;
    try {
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense will retry once its script loads. */
    }
  }, [enabled, slotId]);

  if (!enabled) return null;

  return (
    <ins
      ref={insRef}
      key={`${slotId}-${location.pathname}`}
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={publisherId!}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive="true"
      aria-label={label ?? "Advertisement"}
    />
  );
}
