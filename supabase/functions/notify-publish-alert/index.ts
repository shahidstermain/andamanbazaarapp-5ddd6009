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

function buildEmail(p: AlertPayload) {
  const link =
    p.kind === "post"
      ? `${SITE_URL}/blog/${p.slug ?? p.id}`
      : `${SITE_URL}/listing/${p.id}`;
  const label = p.kind === "post" ? (p.category === "news" ? "News post" : "Blog post") : "Listing";
  const subject = `[AndamanBazaar] New ${label.toLowerCase()} published: ${p.title}`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 8px;font-size:18px">${label} published</h2>
      <p style="margin:0 0 16px;color:#555">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px">
        <div style="font-weight:600;font-size:16px;margin-bottom:6px">${p.title}</div>
        ${p.category ? `<div style="color:#6b7280;font-size:13px">Category: ${p.category}</div>` : ""}
        ${p.city ? `<div style="color:#6b7280;font-size:13px">City: ${p.city}</div>` : ""}
        ${p.price ? `<div style="color:#6b7280;font-size:13px">Price: ₹${p.price}</div>` : ""}
        ${p.author ? `<div style="color:#6b7280;font-size:13px">Author: ${p.author}</div>` : ""}
      </div>
      <p style="margin:20px 0 0"><a href="${link}" style="background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View on site</a></p>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Automated alert from AndamanBazaar.</p>
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

    const { subject, html } = buildEmail(payload);

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