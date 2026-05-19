import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink, BookOpen, MapPin, X } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ALL_TAGS,
  TAG_LABEL,
  islandCreators,
  type CreatorTag,
  type IslandCreator,
} from "@/data/islandCreators";

function matchesQuery(c: IslandCreator, q: string): boolean {
  if (!q) return true;
  const hay = [c.name, c.handle ?? "", c.blurb, c.base, c.tags.join(" ")]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export default function Creators() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<CreatorTag[]>([]);

  const toggle = (t: CreatorTag) =>
    setActive((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const filtered = useMemo(() => {
    return islandCreators.filter(
      (c) =>
        matchesQuery(c, query) &&
        (active.length === 0 || active.every((t) => c.tags.includes(t))),
    );
  }, [query, active]);

  const counts = useMemo(() => {
    const m = new Map<CreatorTag, number>();
    for (const t of ALL_TAGS) m.set(t, 0);
    for (const c of islandCreators) {
      for (const t of c.tags) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <SeoHead
        title="Andaman Island Creators Directory — photographers, drone pilots, dive teams & local media"
        description="A searchable directory of Andaman & Nicobar–based content creators, photographers, drone pilots, dive operators and local media platforms. Curated by AndamanBazaar."
        type="website"
      />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Directory
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Island Creators of the Andamans
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A growing, hand-verified list of {islandCreators.length} photographers,
          drone pilots, DJs, dive teams and travel-media voices based in (or
          deeply tied to) the Andaman & Nicobar Islands.{" "}
          <Link to="/blog/andaman-island-creators-2026" className="underline-offset-2 hover:underline">
            Read the cover story →
          </Link>
        </p>
      </header>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, handle, island or tag…"
          className="pl-9 pr-9"
          aria-label="Search creators"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Tag chips ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {ALL_TAGS.map((t) => {
          const isOn = active.includes(t);
          const count = counts.get(t) ?? 0;
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isOn
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={isOn}
            >
              {TAG_LABEL[t]}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  isOn ? "bg-primary-foreground/20" : "bg-background/60",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
        {(active.length > 0 || query) && (
          <button
            type="button"
            onClick={() => {
              setActive([]);
              setQuery("");
            }}
            className="ml-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
        {islandCreators.length} creators
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No creators match your filters. Try clearing tags or your search.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CreatorCard key={c.id} creator={c} />
          ))}
        </ul>
      )}

      {/* ── Missing-from-list CTA ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-muted/30 p-5">
        <h2 className="text-sm font-semibold">Are we missing someone?</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This list is hand-curated and very much a work in progress. If you (or
          a creator you love) belong here,{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            get in touch
          </Link>{" "}
          and we'll add them.
        </p>
      </div>
    </div>
  );
}

function CreatorCard({ creator }: { creator: IslandCreator }) {
  return (
    <li className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-xs)] transition-all hover:border-primary/30 hover:shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {creator.name}
          </h3>
          {creator.handle && (
            <p className="truncate text-xs text-muted-foreground">
              {creator.handle}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {creator.blurb}
      </p>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span className="truncate">{creator.base}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {creator.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
          >
            {TAG_LABEL[t]}
          </span>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs">
        <a
          href={creator.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Profile
        </a>
        {creator.referenceUrl && (
          <a
            href={creator.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            title={creator.referenceLabel ?? "Reference"}
          >
            <ExternalLink className="h-3 w-3" />
            {creator.referenceLabel ?? "Reference"}
          </a>
        )}
        {creator.storySlug && (
          <Link
            to={`/blog/${creator.storySlug}`}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="h-3 w-3" /> Featured story
          </Link>
        )}
      </div>
    </li>
  );
}