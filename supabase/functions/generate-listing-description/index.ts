import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { callLovableGateway } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You write short, honest, friendly classifieds listings for AndamanBazaar — a hyperlocal marketplace in the Andaman & Nicobar Islands. Voice: warm Hinglish-friendly English, "boat pe bharosa" tone — trustworthy, unpretentious, island-flavored. Output ONLY the description text (2-3 short sentences, max ~280 chars). No emojis, no markdown, no quotes, no prefixes like "Description:". Mention condition naturally if useful. Never invent specs that weren't given.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    // Require an authenticated user to prevent anonymous AI credit drain
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI gateway handles API key check internally

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title ?? "").trim().slice(0, 200);
    const category = String(body?.category ?? "").trim().slice(0, 60);
    const condition = String(body?.condition ?? "").trim().slice(0, 30);
    const area = String(body?.area ?? "").trim().slice(0, 60);
    const price = body?.price != null ? String(body.price).slice(0, 20) : "";

    if (title.length < 3) {
      return new Response(JSON.stringify({ error: "Add a title first" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Title: ${title}
Category: ${category || "n/a"}
Condition: ${condition || "n/a"}
Area: ${area || "n/a"}
Price: ${price || "n/a"}

Write the description.`;

    const res = await callLovableGateway({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", text);
      return new Response(JSON.stringify({ error: "AI helper unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "")
      .replace(/^["']+|["']+$/g, "")
      .trim();

    console.log(`[generate-listing-description] AI response`);

    return new Response(JSON.stringify({ description: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-listing-description error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
