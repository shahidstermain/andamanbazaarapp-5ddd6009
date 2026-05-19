import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Records a "soft" affiliate conversion when a shopper returns to the site
 * with `?ab_click=<click_id>&ab_amount=<inr>&ab_order=<external_id>`.
 *
 * Status is forced to `pending` since merchant has not yet confirmed.
 * Idempotent on (click_id, external_order_id).
 */

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const clickId = typeof body.click_id === "string" ? body.click_id : null;
    const externalOrderId =
      typeof body.external_order_id === "string" ? body.external_order_id : null;
    const amountRaw = Number(body.amount_inr);
    const amountInr =
      Number.isFinite(amountRaw) && amountRaw >= 0 && amountRaw < 10_000_000
        ? Math.round(amountRaw)
        : null;

    if (!clickId) return jsonResponse({ error: "Missing click_id" }, 400);

    // Identify the caller (if any). The Supabase JS client always sends the user JWT in
    // the Authorization header when logged in.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    let callerUserId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      try {
        const userClient = createClient(SUPABASE_URL, ANON, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await userClient.auth.getUser();
        callerUserId = data?.user?.id ?? null;
      } catch {
        // ignore; treated as anonymous
      }
    }

    const admin = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up click for vendor + recommendation context (and freshness check)
    const { data: click, error: cErr } = await admin
      .from("affiliate_clicks")
      .select("id, vendor_id, recommendation_id, user_id, created_at")
      .eq("id", clickId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!click) return jsonResponse({ error: "Unknown click" }, 404);

    // Reject stale clicks (>30 days old). UTM returns should be near-immediate.
    const ageMs = Date.now() - new Date(click.created_at as string).getTime();
    if (ageMs > 30 * 24 * 60 * 60 * 1000) {
      return jsonResponse({ error: "Click expired" }, 410);
    }

    // Authorization: if the click is attributed to a user, the caller must be that user.
    // Anonymous clicks (click.user_id IS NULL) can be reported by anyone, but only once
    // — the underlying record_affiliate_conversion call is idempotent on (click, external_order_id).
    if (click.user_id && click.user_id !== callerUserId) {
      return jsonResponse({ error: "Not authorized for this click" }, 403);
    }

    // Prevent re-injection of pending rows for the same click.
    const { data: existingConv } = await admin
      .from("affiliate_conversions")
      .select("id")
      .eq("click_id", click.id)
      .limit(1)
      .maybeSingle();
    if (existingConv) {
      return jsonResponse({ ok: true, conversion_id: existingConv.id, deduped: true });
    }

    const { data: convId, error } = await admin.rpc("record_affiliate_conversion", {
      _recommendation_id: click.recommendation_id,
      _click_id: click.id,
      _user_id: click.user_id,
      _external_order_id: externalOrderId,
      _amount_inr: amountInr,
      _commission_inr: null,
      _status: "pending",
      _raw_payload: { source: "utm_return" },
    });
    if (error) throw error;

    if (convId) {
      await admin
        .from("affiliate_conversions")
        .update({ vendor_id: click.vendor_id, source: "utm_return" })
        .eq("id", convId);
    }

    return jsonResponse({ ok: true, conversion_id: convId });
  } catch (err) {
    console.error("affiliate-utm-return error", err);
    return jsonResponse({ error: (err as Error).message ?? "Unknown error" }, 400);
  }
});