import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-alert-secret",
};

const ALERT_EMAIL_TO = "shahidstalker@gmail.com";
const SITE_URL = "https://andamanbazaar.in";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AlertPayload {
  kind: "post" | "listing";
  id: string;
  title: string;
  category?: string;
  slug?: string;
  city?: string;
  price?: number | string;
  author?: string;
}

async function getExpectedSecret(): Promise<string | null> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await admin.rpc("get_publish_alert_secret");
  if (error) {
    console.error("vault read failed", error);
    return null;
  }
  return (data as string) ?? null;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryHashtag(category?: string) {
  switch ((category || "").toLowerCase()) {
    case "news":
      return "#AndamanNews";
    case "story":
      return "#AndamanStories";
    default:
      return "#AndamanBlog";
  }
}

function buildWhatsAppCaption(args: {
  title: string;
  excerpt: string;
  link: string;
  category?: string;
}) {
  const tagline =
    args.category === "news"
      ? "Latest from the islands"
      : args.category === "story"
      ? "A story from the Andamans"
      : "New on AndamanBazaar";
  return [
    `*${args.title}*`,
    "",
    args.excerpt,
    "",
    `🔗 Read full story → ${args.link}`,
    "",
    `${tagline}`,
    `#Andaman #AndamanBazaar ${categoryHashtag(args.category)}`,
  ].join("\n");
}

function buildEmail(p: AlertPayload, extra: { coverImage?: string | null; excerpt?: string | null }) {
  const isPost = p.kind === "post";
  const link = isPost
    ? `${SITE_URL}/blog/${p.slug ?? p.id}`
    : `${SITE_URL}/listing/${p.id}`;
  const label = isPost ? (p.category === "news" ? "News post" : p.category === "story" ? "Story" : "Blog post") : "Listing";
  const subject = isPost
    ? `[WhatsApp Channel] Ready to share: ${p.title}`
    : `[AndamanBazaar] New ${label.toLowerCase()}: ${p.title}`;

  const cover = extra.coverImage || "";
  const excerpt =
    (extra.excerpt && extra.excerpt.trim()) ||
    "Tap the link to read the full story on AndamanBazaar.";

  const caption = isPost
    ? buildWhatsAppCaption({ title: p.title, excerpt, link, category: p.category })
    : "";

  // Split-card preview: image (top 60%) + white panel (title + category + URL)
  const card = isPost && cover
    ? `
      <div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="width:100%;aspect-ratio:1080/648;background:#0b1220">
          <img src="${escapeHtml(cover)}" alt="${escapeHtml(p.title)}" style="display:block;width:100%;height:100%;object-fit:cover" />
        </div>
        <div style="padding:18px 20px 20px;background:#fff">
          <div style="display:inline-block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#0ea5e9;font-weight:700;margin-bottom:8px">
            ${escapeHtml((p.category || "blog").toUpperCase())}
          </div>
          <div style="font-weight:700;font-size:18px;line-height:1.3;color:#0f172a;margin-bottom:8px">
            ${escapeHtml(p.title)}
          </div>
          <div style="font-size:13px;color:#475569;line-height:1.45;margin-bottom:10px">
            ${escapeHtml(excerpt.length > 180 ? excerpt.slice(0, 177) + "…" : excerpt)}
          </div>
          <div style="font-size:12px;color:#94a3b8">andamanbazaar.in</div>
        </div>
      </div>`
    : `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px">
        <div style="font-weight:600;font-size:16px;margin-bottom:6px">${escapeHtml(p.title)}</div>
        ${p.category ? `<div style="color:#6b7280;font-size:13px">Category: ${escapeHtml(p.category)}</div>` : ""}
        ${p.city ? `<div style="color:#6b7280;font-size:13px">City: ${escapeHtml(p.city)}</div>` : ""}
        ${p.price ? `<div style="color:#6b7280;font-size:13px">Price: ₹${escapeHtml(String(p.price))}</div>` : ""}
        ${p.author ? `<div style="color:#6b7280;font-size:13px">Author: ${escapeHtml(p.author)}</div>` : ""}
      </div>`;

  const whatsappBlock = isPost
    ? `
      <div style="margin-top:24px">
        <div style="font-size:13px;color:#0f172a;font-weight:600;margin-bottom:8px">
          📱 Paste this into your WhatsApp Channel
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:8px">
          Long-press → Copy. Attach the image above (save it first by long-pressing the picture).
        </div>
        <pre style="white-space:pre-wrap;word-break:break-word;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#0f172a;line-height:1.5;margin:0">${escapeHtml(caption)}</pre>
      </div>`
    : "";

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;background:#f8fafc">
      <h2 style="margin:0 0 4px;font-size:18px">${label} published</h2>
      <p style="margin:0 0 18px;color:#64748b;font-size:13px">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
      ${card}
      <p style="margin:20px 0 0">
        <a href="${escapeHtml(link)}" style="background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open on site</a>
      </p>
      ${whatsappBlock}
      <p style="margin:28px 0 0;color:#94a3b8;font-size:12px">Automated alert from AndamanBazaar. Channel-ready caption generated on publish.</p>
    </div>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const provided = req.headers.get("x-alert-secret") ?? "";
    const expected = await getExpectedSecret();
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as AlertPayload;
    if (!payload?.kind || !payload?.title) {
      return new Response(JSON.stringify({ error: "invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For posts, fetch cover image + excerpt so we can build the WhatsApp share card.
    let coverImage: string | null = null;
    let excerpt: string | null = null;
    if (payload.kind === "post") {
      try {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
        const { data: post } = await admin
          .from("posts")
          .select("cover_image_url, excerpt, slug, category")
          .eq("id", payload.id)
          .maybeSingle();
        if (post) {
          coverImage = (post as any).cover_image_url ?? null;
          excerpt = (post as any).excerpt ?? null;
          if (!payload.slug && (post as any).slug) payload.slug = (post as any).slug;
          if (!payload.category && (post as any).category) payload.category = (post as any).category;
        }
      } catch (e) {
        console.error("post lookup failed", e);
      }
    }

    const { subject, html } = buildEmail(payload, { coverImage, excerpt });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AndamanBazaar Alerts <alerts@andamanbazaar.in>",
        to: [ALERT_EMAIL_TO],
        subject,
        html,
      }),
    });

    const body = await resp.text();
    if (!resp.ok) {
      console.error("resend error", resp.status, body);
      return new Response(JSON.stringify({ error: "send_failed", detail: body }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-publish-alert error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});