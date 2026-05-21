// One-off function to generate and set cover image for the bioluminescence blog post.
// After running, this file should be removed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callImagenGateway, uploadCoverImage } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const slug = "seeing-stars-in-the-sea-a-locals-guide-to-bioluminescence-in-andaman";
  const headline = "Seeing Stars in the Sea: A Local\u2019s Guide to Bioluminescence in Andaman";
  const altText = "A dark, moonless beach on Havelock Island at night, with glowing blue bioluminescent plankton sparkling in the water as gentle waves break on the shore, creating a magical starry-sea effect";

  try {
    // 1. Generate cover via Imagen
    const prompt = `Cinematic, photo-realistic editorial cover image for an Andaman Islands travel blog post titled: "${headline}".
Visual brief: ${altText}.
Tropical, scenic, true-to-place, no text overlays, no watermarks.`;

    const result = await callImagenGateway(prompt);
    if (!result.ok || !result.imageDataUrl) {
      return new Response(
        JSON.stringify({ ok: false, error: result.error || "No image generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Upload to storage using service key
    const coverUrl = await uploadCoverImage(result.imageDataUrl, "stories-agent");
    if (!coverUrl) {
      return new Response(
        JSON.stringify({ ok: false, error: "Upload failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Patch the post record
    const { error: updateErr } = await supabase
      .from("posts")
      .update({ cover_image_url: coverUrl })
      .eq("slug", slug);

    if (updateErr) {
      return new Response(
        JSON.stringify({ ok: false, error: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, cover_url: coverUrl, slug }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
