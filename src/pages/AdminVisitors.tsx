import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGuard } from "@/components/AdminGuard";
import { SeoHead } from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdsDiagnostics } from "@/components/AdsDiagnostics";

type Event = {
  id: string;
  session_id: string;
  user_id: string | null;
  path: string | null;
  referer: string | null;
  user_agent: string | null;
  country: string | null;
  created_at: string;
};

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 3650,
};

function detectDevice(ua: string): "Mobile" | "Tablet" | "Desktop" {
  const s = ua.toLowerCase();
  if (/ipad|tablet/.test(s)) return "Tablet";
  if (/mobile|iphone|android/.test(s)) return "Mobile";
  return "Desktop";
}
function detectBrowser(ua: string): string {
  const s = ua.toLowerCase();
  if (/edg\//.test(s)) return "Edge";
  if (/opr\//.test(s) || /opera/.test(s)) return "Opera";
  if (/chrome\//.test(s) && !/edg\//.test(s)) return "Chrome";
  if (/firefox\//.test(s)) return "Firefox";
  if (/safari\//.test(s) && !/chrome\//.test(s)) return "Safari";
  return "Other";
}
function refererBucket(ref: string | null): string {
  if (!ref) return "Direct / none";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (/google\./.test(host)) return "Google";
    if (/bing\./.test(host)) return "Bing";
    if (/duckduckgo\./.test(host)) return "DuckDuckGo";
    if (/facebook\.|fb\./.test(host)) return "Facebook";
    if (/instagram\./.test(host)) return "Instagram";
    if (/t\.co|twitter\.|x\.com/.test(host)) return "Twitter/X";
    if (/linkedin\./.test(host)) return "LinkedIn";
    if (/reddit\./.test(host)) return "Reddit";
    if (/whatsapp\./.test(host)) return "WhatsApp";
    if (/youtube\./.test(host)) return "YouTube";
    if (/lovable\./.test(host)) return "Lovable";
    return host;
  } catch {
    return "Other";
  }
}
function isSearchEngine(bucket: string) {
  return ["Google", "Bing", "DuckDuckGo"].includes(bucket);
}

function countBy<T extends string>(arr: T[]): { key: T; count: number }[] {
  const m = new Map<T, number>();
  arr.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
  return [...m.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function TopList({
  rows,
  total,
  emptyLabel = "—",
  limit = 10,
}: {
  rows: { key: string; count: number }[];
  total: number;
  emptyLabel?: string;
  limit?: number;
}) {
  const top = rows.slice(0, limit);
  if (top.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="w-24 text-right">Sessions</TableHead>
          <TableHead className="w-20 text-right">Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {top.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="max-w-[420px] truncate font-mono text-xs">
              {r.key || "(empty)"}
            </TableCell>
            <TableCell className="text-right tabular-nums">{r.count}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {total ? Math.round((r.count / total) * 100) : 0}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function buildSeoSuggestions(events: Event[]): string[] {
  const out: string[] = [];
  if (events.length < 10) {
    out.push(
      "Not enough traffic yet to derive strong SEO signals. Focus on publishing 2–4 cornerstone blog posts targeting high-intent Andaman queries, then revisit this dashboard in 2–4 weeks.",
    );
    return out;
  }

  const total = events.length;
  const buckets = events.map((e) => refererBucket(e.referer));
  const refCounts = countBy(buckets);
  const directShare =
    (refCounts.find((r) => r.key === "Direct / none")?.count ?? 0) / total;
  const searchShare =
    refCounts.filter((r) => isSearchEngine(r.key)).reduce((s, r) => s + r.count, 0) /
    total;
  const socialShare =
    refCounts
      .filter((r) =>
        ["Facebook", "Instagram", "Twitter/X", "LinkedIn", "Reddit", "WhatsApp", "YouTube"].includes(
          r.key,
        ),
      )
      .reduce((s, r) => s + r.count, 0) / total;

  if (searchShare < 0.15) {
    out.push(
      `Only ${(searchShare * 100).toFixed(0)}% of sessions come from search engines. Strengthen on-page SEO: unique <title> + meta description per route, internal links from /blog posts to /listings and /trip-planner, and submit /sitemap.xml in Google Search Console.`,
    );
  } else if (searchShare > 0.4) {
    out.push(
      `Search engines drive ${(searchShare * 100).toFixed(0)}% of traffic — your strongest channel. Double down: expand top-performing blog posts with FAQ schema and add JSON-LD Article markup site-wide.`,
    );
  }

  if (directShare > 0.85) {
    out.push(
      `${(directShare * 100).toFixed(0)}% of sessions arrive with no referer (direct or stripped). Add UTM tags to every external link you share (WhatsApp, Instagram bio, email) so you can attribute campaigns.`,
    );
  }

  // Path analysis
  const paths = events.map((e) => e.path || "/");
  const pathCounts = countBy(paths);
  const topPath = pathCounts[0];
  if (topPath && topPath.count / total > 0.5) {
    out.push(
      `${Math.round((topPath.count / total) * 100)}% of sessions land on ${topPath.key}. Diversify entry points: build SEO-targeted landing pages for each island (Havelock, Neil, Port Blair) and each top blog category, then internally link them.`,
    );
  }

  const blogShare =
    pathCounts.filter((p) => p.key.startsWith("/blog")).reduce((s, p) => s + p.count, 0) /
    total;
  if (blogShare < 0.1) {
    out.push(
      "Blog pages attract <10% of sessions. Publish 1–2 long-form posts per week targeting long-tail Andaman search queries (e.g. 'best time to visit Havelock', 'Port Blair ferry timings'). These compound over months.",
    );
  }

  // Device split
  const devices = events
    .map((e) => (e.user_agent ? detectDevice(e.user_agent) : "Desktop"))
    .filter(Boolean);
  const devCounts = countBy(devices);
  const mobileShare =
    (devCounts.find((d) => d.key === "Mobile")?.count ?? 0) / total;
  if (mobileShare > 0.6) {
    out.push(
      `${Math.round(mobileShare * 100)}% of visitors are on mobile. Run a Lighthouse mobile audit on key routes (/, /listings, /blog/[slug]) — aim for LCP < 2.5s and CLS < 0.1; compress hero images to WebP and lazy-load below-the-fold media.`,
    );
  }

  // Country split
  const countries = events.map((e) => e.country || "Unknown");
  const cCounts = countBy(countries);
  const indiaShare = (cCounts.find((c) => c.key === "IN")?.count ?? 0) / total;
  if (indiaShare < 0.5) {
    out.push(
      `Only ${Math.round(indiaShare * 100)}% of traffic is from India — your primary market. Add hreflang="en-IN" on key routes, target ₹ pricing in titles/meta, and earn local backlinks (Andaman tourism blogs, travel forums).`,
    );
  }

  if (socialShare < 0.05) {
    out.push(
      "Social referrals are <5%. Add OG image presets per blog post (already supported via SeoHead) and share new posts on Instagram + WhatsApp with UTM tags.",
    );
  }

  // 404 / dead paths heuristic
  const notFoundLike = pathCounts.filter((p) =>
    /\/(undefined|null|404)/i.test(p.key),
  );
  if (notFoundLike.length > 0) {
    out.push(
      `Detected ${notFoundLike.length} suspicious paths (e.g. ${notFoundLike[0].key}). Audit broken links and add proper 301 redirects.`,
    );
  }

  if (out.length === 0) {
    out.push("Traffic mix looks balanced. Keep publishing 1–2 SEO-targeted posts per week and re-check this dashboard monthly.");
  }
  return out;
}

function VisitorsDashboard() {
  const [range, setRange] = useState<string>("30d");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const days = RANGE_DAYS[range] ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { data, error } = await supabase
      .from("visitor_events")
      .select("id, session_id, user_id, path, referer, user_agent, country, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (!error && data) setEvents(data as Event[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const stats = useMemo(() => {
    const total = events.length;
    const signedIn = events.filter((e) => e.user_id).length;
    const paths = countBy(events.map((e) => e.path || "/"));
    const refs = countBy(events.map((e) => refererBucket(e.referer)));
    const countries = countBy(events.map((e) => e.country || "Unknown"));
    const devices = countBy(
      events.map((e) => (e.user_agent ? detectDevice(e.user_agent) : "Unknown")),
    );
    const browsers = countBy(
      events.map((e) => (e.user_agent ? detectBrowser(e.user_agent) : "Unknown")),
    );
    // Per-day series
    const byDay = new Map<string, number>();
    events.forEach((e) => {
      const d = e.created_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    });
    const series = [...byDay.entries()]
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
    return { total, signedIn, paths, refs, countries, devices, browsers, series };
  }, [events]);

  const suggestions = useMemo(() => buildSeoSuggestions(events), [events]);
  const maxDay = Math.max(1, ...stats.series.map((s) => s.count));

  const [drafts, setDrafts] = useState<SeoDraft[] | null>(null);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);

  const generateDrafts = async () => {
    setDraftsLoading(true);
    setDraftsError(null);
    try {
      const { data, error } = await supabase.functions.invoke("seo-generate-drafts", {
        body: {
          topPaths: stats.paths.slice(0, 8),
          topReferers: stats.refs.slice(0, 6),
          topCountries: stats.countries.slice(0, 6),
          suggestions,
          totalSessions: stats.total,
        },
      });
      if (error) throw error;
      const list = Array.isArray((data as any)?.drafts) ? ((data as any).drafts as SeoDraft[]) : [];
      setDrafts(list);
      if (list.length === 0) {
        toast({
          title: "No drafts generated",
          description: "Try again with a wider date range.",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate drafts";
      setDraftsError(msg);
      toast({ title: "Could not generate drafts", description: msg, variant: "destructive" });
    } finally {
      setDraftsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <SeoHead title="Visitor Insights — Admin · AndamanBazaar" description="Internal visitor analytics and SEO recommendations." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Visitor Insights</h1>
          <p className="text-sm text-muted-foreground">
            Internal admin dashboard · privacy-minimised tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <Shield className="mt-1 h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">Privacy & compliance</CardTitle>
            <CardDescription className="mt-1 leading-relaxed">
              We store one row per browser session: a random session ID, the visited path, the referring URL, a truncated user-agent string, and a 2-letter country code derived from request headers. <strong>No raw IP addresses</strong>, no full names, no precise location, no cross-site identifiers, and no third-party cookies. Logged-in users have their user ID linked so admins can audit their own activity. Access is restricted to admins via row-level security. Retention follows our Privacy Policy — purge older rows manually if a longer window is not needed.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sessions" value={stats.total} />
        <Stat label="Signed-in sessions" value={stats.signedIn} />
        <Stat label="Countries" value={stats.countries.length} />
        <Stat label="Unique paths" value={stats.paths.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily sessions</CardTitle>
          <CardDescription>Last {stats.series.length} active days in the selected range</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.series.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <div className="flex h-32 items-end gap-1">
              {stats.series.map((s) => (
                <div
                  key={s.day}
                  className="flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary"
                  style={{ height: `${(s.count / maxDay) * 100}%` }}
                  title={`${s.day}: ${s.count}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top landing paths</CardTitle>
          </CardHeader>
          <CardContent>
            <TopList rows={stats.paths} total={stats.total} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <TopList rows={stats.refs} total={stats.total} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <TopList rows={stats.countries} total={stats.total} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Devices & browsers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TopList rows={stats.devices} total={stats.total} limit={4} />
            <TopList rows={stats.browsers} total={stats.total} limit={6} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO suggestions from your data</CardTitle>
          <CardDescription>Heuristic recommendations derived from the metrics above.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {suggestions.map((s, i) => (
              <li key={i} className="flex gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">{i + 1}</Badge>
                <span className="text-sm leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">SEO update drafts</CardTitle>
            <CardDescription>
              AI-generated title, meta description and internal-link drafts for your top landing paths.
              Review before shipping — drafts are not auto-applied.
            </CardDescription>
          </div>
          <Button onClick={generateDrafts} disabled={draftsLoading || stats.total === 0} size="sm">
            {draftsLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {drafts ? "Regenerate" : "Generate drafts"}
          </Button>
        </CardHeader>
        <CardContent>
          {draftsError && (
            <p className="text-sm text-destructive">{draftsError}</p>
          )}
          {!drafts && !draftsLoading && !draftsError && (
            <p className="text-sm text-muted-foreground">
              Click <em>Generate drafts</em> to turn the suggestions above into copy-ready edits.
            </p>
          )}
          {drafts && drafts.length > 0 && (
            <div className="space-y-4">
              {drafts.map((d) => (
                <DraftCard key={d.path} draft={d} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdsDiagnostics />
    </div>
  );
}

type SeoDraft = {
  path: string;
  title: string;
  description: string;
  internalLinks: { anchor: string; to: string }[];
  rationale: string;
};

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="ml-1 text-xs">{label ?? (copied ? "Copied" : "Copy")}</span>
    </Button>
  );
}

function DraftCard({ draft }: { draft: SeoDraft }) {
  const titleOver = draft.title.length > 60;
  const descOver = draft.description.length > 160;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">{draft.path}</Badge>
      </div>
      <div className="space-y-3">
        <Field
          label="Title tag"
          value={draft.title}
          meta={`${draft.title.length}/60 chars`}
          warn={titleOver}
        />
        <Field
          label="Meta description"
          value={draft.description}
          meta={`${draft.description.length}/160 chars`}
          warn={descOver}
          multiline
        />
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Internal links</p>
          {draft.internalLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions.</p>
          ) : (
            <ul className="space-y-1.5">
              {draft.internalLinks.map((l, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">{l.anchor}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">→ {l.to}</span>
                  </span>
                  <CopyButton
                    value={`<a href="${l.to}">${l.anchor}</a>`}
                    label="HTML"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        {draft.rationale && (
          <p className="rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">
            {draft.rationale}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  meta,
  warn,
  multiline,
}: {
  label: string;
  value: string;
  meta: string;
  warn?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${warn ? "text-destructive" : "text-muted-foreground"}`}>
            {meta}
          </span>
          <CopyButton value={value} />
        </div>
      </div>
      <p
        className={`rounded-md border bg-background p-2 text-sm ${
          multiline ? "whitespace-pre-wrap" : "truncate"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminVisitors() {
  return (
    <AdminGuard>
      <VisitorsDashboard />
    </AdminGuard>
  );
}