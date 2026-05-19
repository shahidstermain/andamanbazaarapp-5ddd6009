// Edge function that returns a small HTML page with per-target og:* tags,
// then client-redirects humans to the canonical andamanbazaar.in URL.
//
// URL shapes:
//   /functions/v1/share/blog/<slug>
//   /functions/v1/share/listing/<id>
//
// Social crawlers (WhatsApp, Facebook, LinkedIn, iMessage, Slack, Discord,
// Telegram, Twitter) don't execute JS, so the inline og:* tags are what
// they read. Human browsers immediately follow the JS / meta-refresh.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = "https://andamanbazaar.in";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const DEFAULT_IMAGE = `${SITE}/og-image.png`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clip(s: string, n: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

type Meta = {
  title: string;
  description: string;
  image: string;
  url: string;
  type: "article" | "website" | "product";
  jsonLd?: Record<string, unknown>;
};

function renderHtml(m: Meta, forwardQuery: string): string {
  const target = m.url + forwardQuery;
  const safeTarget = esc(target);
  const jsonLd = m.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}" />
<link rel="canonical" href="${esc(m.url)}" />
<meta property="og:type" content="${m.type}" />
<meta property="og:site_name" content="AndamanBazaar" />
<meta property="og:title" content="${esc(m.title)}" />
<meta property="og:description" content="${esc(m.description)}" />
<meta property="og:url" content="${esc(m.url)}" />
<meta property="og:image" content="${esc(m.image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="en_IN" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@andamanbazaar" />
<meta name="twitter:title" content="${esc(m.title)}" />
<meta name="twitter:description" content="${esc(m.description)}" />
<meta name="twitter:image" content="${esc(m.image)}" />
<meta http-equiv="refresh" content="0;url=${safeTarget}" />
${jsonLd}
<style>body{font-family:system-ui,sans-serif;background:#0d7a85;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center}a{color:#fff}</style>
</head>
<body>
<div>
<p>Opening ${esc(m.title)}…</p>
<p><a href="${safeTarget}">Tap here if it doesn't redirect</a></p>
</div>
<script>window.location.replace(${JSON.stringify(target)});</script>
</body>
</html>`;
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Allow crawlers to cache; keep it short for content updates.
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

function fallback(): Meta {
  return {
    title: "AndamanBazaar — Island marketplace, boat pe bharosa",
    description:
      "Hyperlocal marketplace for the Andaman & Nicobar Islands. Buy, sell and discover local experiences across Port Blair, Havelock, Neil and Diglipur.",
    image: DEFAULT_IMAGE,
    url: SITE + "/",
    type: "website",
  };
}

async function metaForBlog(slug: string, forwardQuery: string): Promise<Meta> {
  const { data } = await supabase
    .from("posts")
    .select("title, slug, excerpt, content, cover_image_url, category, tags, published_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return { ...fallback(), url: `${SITE}/blog/${slug}` };

  const desc = clip(data.excerpt ?? data.content ?? "", 200);
  const url = `${SITE}/blog/${data.slug}`;
  return {
    title: `${data.title} — AndamanBazaar`,
    description: desc,
    image: data.cover_image_url || DEFAULT_IMAGE,
    url,
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: data.title,
      description: desc,
      image: data.cover_image_url ? [data.cover_image_url] : undefined,
      datePublished: data.published_at,
      dateModified: data.updated_at,
      keywords: (data.tags ?? []).join(", "),
      mainEntityOfPage: url,
      publisher: { "@type": "Organization", name: "AndamanBazaar" },
    },
  };
}

async function metaForListing(id: string): Promise<Meta> {
  const { data } = await supabase
    .from("listings")
    .select("id, title, description, price, city, area, listing_images(image_url, display_order)")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return { ...fallback(), url: `${SITE}/listings/${id}` };

  const cover = (data.listing_images ?? [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)[0]?.image_url as string | undefined;
  const place = [data.area, data.city].filter(Boolean).join(", ");
  const priceLabel = `₹${Number(data.price).toLocaleString("en-IN")}`;
  const desc = clip(`${priceLabel}${place ? " · " + place : ""} — ${data.description ?? ""}`, 200);
  const url = `${SITE}/listings/${data.id}`;

  return {
    title: `${data.title} — ${priceLabel} on AndamanBazaar`,
    description: desc,
    image: cover || DEFAULT_IMAGE,
    url,
    type: "product",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: data.title,
      description: clip(data.description ?? "", 500),
      image: cover ? [cover] : undefined,
      offers: {
        "@type": "Offer",
        price: Number(data.price),
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url,
      },
    },
  };
}

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    // Path after the function name. Supabase routes /functions/v1/share/<rest>.
    // u.pathname looks like /share/blog/<slug> or /functions/v1/share/blog/<slug>.
    const parts = u.pathname.split("/").filter(Boolean);
    const shareIdx = parts.indexOf("share");
    const tail = shareIdx >= 0 ? parts.slice(shareIdx + 1) : parts;
    const [kind, ...rest] = tail;
    const id = rest.join("/");
    const forwardQuery = u.search || "";

    let meta: Meta;
    if (kind === "blog" && id) meta = await metaForBlog(id, forwardQuery);
    else if (kind === "listing" && id) meta = await metaForListing(id);
    else meta = fallback();

    return html(renderHtml(meta, forwardQuery));
  } catch (err) {
    console.error("share function error", err);
    return html(renderHtml(fallback(), ""), 200);
  }
});