/**
 * Generates text embeddings using Google text-embedding-004 via Gemini API.
 * Returns a 768-dimensional float array, or null if the API call fails.
 */
export async function embed(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.warn("[embed] GEMINI_API_KEY not set");
    return null;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: text.slice(0, 8000) }] },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[embed] Gemini ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    return (data?.embedding?.values as number[]) ?? null;
  } catch (e) {
    console.error("[embed] exception:", e);
    return null;
  }
}
