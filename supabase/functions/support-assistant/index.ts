/**
 * support-assistant — RAG-powered database support Q&A endpoint.
 *
 * Flow:
 *  1. Embed the user's question via Gemini text-embedding-004
 *  2. Vector-search support_knowledge for the top-5 relevant chunks
 *  3. Fallback to full-text search if no embedding results
 *  4. Call the AI gateway with retrieved context injected into the prompt
 *  5. Log the query + answer to support_query_logs for the feedback loop
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { callLovableGateway } from "../_shared/ai-gateway.ts";
import { embed } from "../_shared/embed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an expert database support engineer helping other support engineers diagnose and resolve database issues across PostgreSQL, MySQL, MongoDB, Redis, and related technologies.

Rules:
- Answer ONLY using the provided context documents
- If context is insufficient, say exactly: "I don't have enough context to answer confidently — check the internal runbooks or escalate to L3"
- Always include specific SQL commands, config flags, or diagnostic steps when available in the context
- Cite the source document by title when you use it
- Never invent error codes, version-specific behavior, or flags that aren't in the context
- Format answers with numbered steps for multi-step procedures`;

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

    // Verify the caller is an authenticated user
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

    const body = await req.json().catch(() => ({}));
    const question = String(body?.question ?? "").trim().slice(0, 2000);

    if (question.length < 5) {
      return new Response(JSON.stringify({ error: "Question too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(SUPABASE_URL, SERVICE);

    // Step 1: Embed the question
    const queryEmbedding = await embed(question);

    // Step 2: Vector similarity search
    type DocResult = { title: string; source: string; content: string; similarity: number };
    let contextDocs: DocResult[] = [];

    if (queryEmbedding) {
      const { data: matches, error: matchErr } = await serviceClient.rpc(
        "match_support_knowledge",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.70,
          match_count: 5,
        }
      );
      if (matchErr) {
        console.error("[support-assistant] vector search error:", matchErr.message);
      } else {
        contextDocs = (matches ?? []).map((m: any) => ({
          title: m.title ?? "Untitled",
          source: m.source ?? "unknown",
          content: m.content,
          similarity: m.similarity,
        }));
      }
    }

    // Step 3: Fallback to full-text search when vector search returns nothing
    if (contextDocs.length === 0) {
      const ftsQuery = question.split(/\s+/).slice(0, 6).join(" | ");
      const { data: ftsResults } = await serviceClient
        .from("support_knowledge")
        .select("title, source, content")
        .textSearch("content", ftsQuery, { type: "websearch", config: "english" })
        .limit(5);
      contextDocs = (ftsResults ?? []).map((r: any) => ({
        title: r.title ?? "Untitled",
        source: r.source ?? "unknown",
        content: r.content,
        similarity: 0,
      }));
    }

    // Step 4: Build the context block and call the AI
    const contextBlock = contextDocs.length > 0
      ? contextDocs
          .map((d, i) => `[${i + 1}] ${d.title} (source: ${d.source})\n${d.content}`)
          .join("\n\n---\n\n")
      : "No relevant documents found in the knowledge base.";

    const userPrompt = `Context documents:\n\n${contextBlock}\n\n---\n\nQuestion from support engineer: ${question}`;

    const res = await callLovableGateway({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
    });

    if (!res.ok) {
      console.error("[support-assistant] AI gateway failed");
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const answer = String(data?.choices?.[0]?.message?.content ?? "").trim();

    // Step 5: Log for feedback loop (non-blocking)
    serviceClient
      .from("support_query_logs")
      .insert({
        user_id: userData.user.id,
        question,
        answer,
        sources: contextDocs.map((d) => ({
          title: d.title,
          source: d.source,
          similarity: d.similarity,
        })),
        doc_count: contextDocs.length,
      })
      .then(({ error }) => {
        if (error) console.warn("[support-assistant] log failed:", error.message);
      });

    return new Response(
      JSON.stringify({
        answer,
        sources: contextDocs.map((d) => ({ title: d.title, source: d.source })),
        doc_count: contextDocs.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[support-assistant] unexpected error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
