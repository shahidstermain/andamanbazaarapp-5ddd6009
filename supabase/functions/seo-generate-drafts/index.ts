import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { callLovableGateway } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type TopRow = { key: string; count: number };
type Body = {
  topPaths?: TopRow[];
  topReferers?: TopRow[];
  topCountries?: TopRow[];
  suggestions?: string[];
  totalSessions?: number;
};

const SYSTEM = `You are an SEO editor for AndamanBazaar — a hyperlocal marketplace and travel guide for the Andaman & Nicobar Islands (primary market: India).

Voice: warm, trustworthy, "boat pe bharosa". Plain English with light Hinglish flavor allowed in body copy, but NEVER in <title> or meta description. Never invent facts.

Constraints (strict):
- Title: max 60 characters, includes a primary keyword, brand "AndamanBazaar" only if it fits.
- Description: max 155 characters, action-oriented, one clear value prop, no clickbait.
- Internal links: 2–4 per page, anchor text must be a natural noun phrase (no "click here"). Target paths MUST come from the provided "knownRoutes" list — never invent routes.
- Rationale: one short sentence explaining how the draft addresses the analytics signal.

Return ONLY valid JSON matching the tool schema. No prose, no markdown.`;

const KNOWN_ROUTES = [
  "/",
  "/listings",
  "/sell",
  "/blog",
  "/trip-planner",
  "/creators",
  "/pricing",
  "/contact",
  "/editorial-policy",
  "/whats-new",
];

function normalisePath(p: string): string {
  if (!p) return "/";
  // Collapse query strings and trailing slash noise
  const clean = p.split("?")[0].split("#")[0];
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    const topPaths = (body.topPaths ?? [])
      .slice(0, 8)
      .map((r) => ({ key: normalisePath(String(r.key ?? "/")), count: Number(r.count) || 0 }));
    const topReferers = (body.topReferers ?? []).slice(0, 6);
    const topCountries = (body.topCountries ?? []).slice(0, 6);
    const suggestions = (body.suggestions ?? []).slice(0, 8).map(String);
    const totalSessions = Number(body.totalSessions) || 0;

    if (topPaths.length === 0) {
      return json({ drafts: [] });
    }

    const userPrompt = `Total sessions in window: ${totalSessions}

Top landing paths (path, sessions):
${topPaths.map((p) => `- ${p.key} (${p.count})`).join("\n")}

Top referer buckets:
${topReferers.map((r) => `- ${r.key} (${r.count})`).join("\n") || "- (none)"}

Top countries:
${topCountries.map((c) => `- ${c.key} (${c.count})`).join("\n") || "- (none)"}

Data-derived SEO suggestions:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n") || "(none)"}

knownRoutes (internal link targets must come from this list):
${KNOWN_ROUTES.join(", ")}

Task: for each of the top paths, produce a draft <title>, meta description, 2–4 internal links (anchor + target from knownRoutes), and a one-sentence rationale tying back to the analytics. Return JSON only via the tool call.`;

    const res = await callLovableGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "emit_seo_drafts",
            description: "Return SEO drafts for each requested path.",
            parameters: {
              type: "object",
              properties: {
                drafts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: { type: "string" },
                      title: { type: "string", maxLength: 60 },
                      description: { type: "string", maxLength: 160 },
                      internalLinks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            anchor: { type: "string" },
                            to: { type: "string" },
                          },
                          required: ["anchor", "to"],
                        },
                      },
                      rationale: { type: "string" },
                    },
                    required: ["path", "title", "description", "internalLinks", "rationale"],
                  },
                },
              },
              required: ["drafts"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "emit_seo_drafts" } },
      temperature: 0.4,
    });

    if (!res.ok) {
      console.error("seo-generate-drafts gateway error", res.statusText);
      return json({ error: "AI helper unavailable" }, 502);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: { drafts?: unknown } = {};
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw ?? {};
    } catch (e) {
      console.error("Failed to parse tool arguments", e, raw);
      return json({ error: "Invalid AI response" }, 502);
    }

    const drafts = Array.isArray(parsed.drafts) ? parsed.drafts : [];
    const knownSet = new Set(KNOWN_ROUTES);
    const cleaned = drafts
      .map((d: any) => {
        const path = normalisePath(String(d?.path ?? "/"));
        const links = Array.isArray(d?.internalLinks)
          ? d.internalLinks
              .map((l: any) => ({
                anchor: String(l?.anchor ?? "").slice(0, 80).trim(),
                to: normalisePath(String(l?.to ?? "")),
              }))
              .filter((l: any) => l.anchor && knownSet.has(l.to) && l.to !== path)
              .slice(0, 4)
          : [];
        return {
          path,
          title: String(d?.title ?? "").slice(0, 70).trim(),
          description: String(d?.description ?? "").slice(0, 170).trim(),
          internalLinks: links,
          rationale: String(d?.rationale ?? "").slice(0, 240).trim(),
        };
      })
      .filter((d: any) => d.title && d.description);

    return json({ drafts: cleaned });
  } catch (e) {
    console.error("seo-generate-drafts error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}