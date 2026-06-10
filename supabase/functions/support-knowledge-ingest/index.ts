/**
 * support-knowledge-ingest — Admin-only endpoint to add documents to the RAG knowledge base.
 *
 * Accepts a document (title + content + source), splits it into overlapping chunks,
 * embeds each chunk via Gemini text-embedding-004, and stores in support_knowledge.
 *
 * Body: { title: string, content: string, source?: string, metadata?: object }
 * Returns: { chunks_total, chunks_ingested, results[] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { embed } from "../_shared/embed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Split text into overlapping chunks so no context is lost at boundaries. */
function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 30) chunks.push(chunk);
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an authenticated admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin, error: roleErr } = await serviceClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title ?? "").trim().slice(0, 500);
    const content = String(body?.content ?? "").trim();
    const source = String(body?.source ?? "manual").trim().slice(0, 50);
    const metadata = typeof body?.metadata === "object" && body.metadata !== null
      ? body.metadata
      : {};

    if (!title) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (content.length < 20) {
      return new Response(JSON.stringify({ error: "content too short (min 20 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks = chunkText(content);
    const results: Array<{ chunk: number; ok: boolean; id?: string; error?: string }> = [];

    for (const [i, chunk] of chunks.entries()) {
      const embedding = await embed(chunk);
      const chunkTitle = chunks.length > 1
        ? `${title} (${i + 1}/${chunks.length})`
        : title;

      const { data, error } = await serviceClient
        .from("support_knowledge")
        .insert({
          title: chunkTitle,
          content: chunk,
          embedding,
          source,
          metadata: { ...metadata, chunk_index: i, total_chunks: chunks.length },
        })
        .select("id")
        .single();

      if (error) {
        console.error(`[ingest] chunk ${i} failed:`, error.message);
        results.push({ chunk: i, ok: false, error: error.message });
      } else {
        results.push({ chunk: i, ok: true, id: data.id });
      }
    }

    const ingested = results.filter((r) => r.ok).length;
    console.log(`[ingest] "${title}" — ${ingested}/${chunks.length} chunks stored`);

    return new Response(
      JSON.stringify({
        chunks_total: chunks.length,
        chunks_ingested: ingested,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[support-knowledge-ingest] unexpected error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
