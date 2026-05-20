/**
 * AI Gateway - Drop-in replacement for Lovable AI Gateway
 * 
 * This module provides a function `callLovableGateway` that mimics the old
 * `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)` interface
 * but routes through MiniMax first, falling back to Lovable.
 * 
 * Usage in edge functions:
 *   import { callLovableGateway } from "../_shared/ai-gateway.ts";
 *   
 *   // Old code:
 *   const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
 *     method: "POST",
 *     headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
 *     body: JSON.stringify({ model, messages, ... })
 *   });
 *   
 *   // New code:
 *   const res = await callLovableGateway({ model, messages, ... });
 *   
 *   // Works identically - same response format!
 */

export type GatewayOptions = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: any;
};

/**
 * Response type matching the Lovable gateway format
 */
export type GatewayResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
};

/**
 * Drop-in replacement for fetch to Lovable AI Gateway
 * Tries MiniMax first, falls back to Lovable
 */
export async function callLovableGateway(options: GatewayOptions): Promise<GatewayResponse> {
  // Try MiniMax first
  const mmResult = await tryMiniMax(options);
  if (mmResult.ok) {
    console.log("[ai-gateway] MiniMax succeeded");
    return mmResult;
  }
  
  console.log(`[ai-gateway] MiniMax failed: ${mmResult.error}, trying Lovable...`);
  
  // Fallback to Lovable
  const lovableResult = await tryLovable(options);
  if (lovableResult.ok) {
    console.log("[ai-gateway] Lovable fallback succeeded");
    return lovableResult;
  }
  
  console.error(`[ai-gateway] Both failed. MiniMax: ${mmResult.error}, Lovable: ${lovableResult.error}`);
  
  // Return error response
  return {
    ok: false,
    status: 500,
    statusText: `MiniMax: ${mmResult.error}, Lovable: ${lovableResult.error}`,
    json: async () => ({ error: "AI gateway failed" }),
    text: async () => JSON.stringify({ error: "AI gateway failed" }),
  };
}

async function tryMiniMax(options: GatewayOptions): Promise<{
  ok: boolean;
  error?: string;
  response?: GatewayResponse;
}> {
  const apiKey = Deno.env.get("MINIMAX_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "MINIMAX_API_KEY not set" };
  }

  // Map model names - MiniMax uses different model identifiers
  let mmModel = "MiniMax-Text-01";
  if (options.model.includes("gemini-2.5-pro")) {
    mmModel = "abab6.5s-chat";
  } else if (options.model.includes("gemini-3-flash")) {
    mmModel = "abab6.5s-chat";
  }

  try {
    const res = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: mmModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 4096,
        tools: options.tools,
        tool_choice: options.tool_choice,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `${res.status}: ${text.slice(0, 100)}` };
    }

    const data = await res.json();
    
    // Convert MiniMax response to Lovable format
    return {
      ok: true,
      response: {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => convertToLovableFormat(data, options),
        text: async () => JSON.stringify(convertToLovableFormat(data, options)),
      },
    };
  } catch (e) {
    return { ok: false, error: `Exception: ${e}` };
  }
}

async function tryLovable(options: GatewayOptions): Promise<{
  ok: boolean;
  error?: string;
  response?: GatewayResponse;
}> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "LOVABLE_API_KEY not set" };
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      const text = await res.text();
      // Don't treat 429/402 as permanent failures - they're retryable
      if (res.status === 429 || res.status === 402) {
        return { ok: false, error: `${res.status}` };
      }
      return { ok: false, error: `${res.status}: ${text.slice(0, 100)}` };
    }

    return {
      ok: true,
      response: {
        ok: true,
        status: res.status,
        statusText: res.statusText,
        json: () => res.json(),
        text: () => res.text(),
      },
    };
  } catch (e) {
    return { ok: false, error: `Exception: ${e}` };
  }
}

/**
 * Convert MiniMax response to match Lovable/OpenAI format
 */
function convertToLovableFormat(mmData: any, options: GatewayOptions): any {
  // MiniMax returns: { id, model, choices: [{ index, message: { role, content } }] }
  // Lovable returns: OpenAI format
  
  const choices = mmData?.choices ?? [];
  
  // If using tools, need to handle tool_calls
  if (options.tools && options.tool_choice) {
    const toolName = options.tool_choice?.function?.name;
    if (toolName && mmData?.choices?.[0]?.message?.tool_calls) {
      return {
        id: mmData.id,
        model: mmData.model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: null,
            tool_calls: mmData.choices[0].message.tool_calls.map((tc: any) => ({
              id: tc.id || `call_${Date.now()}`,
              type: "function",
              function: {
                name: tc.function?.name || toolName,
                arguments: tc.function?.arguments || "{}",
              },
            })),
          },
          finish_reason: "tool_calls",
        }],
        usage: mmData.usage,
      };
    }
  }
  
  return {
    id: mmData.id || `minimax-${Date.now()}`,
    model: options.model,
    choices: choices.map((c: any, i: number) => ({
      index: i,
      message: {
        role: c.message?.role || "assistant",
        content: c.message?.content || "",
      },
      finish_reason: c.finish_reason || "stop",
    })),
    usage: mmData.usage,
  };
}

// Re-export callAI for advanced usage
export { callAI } from "./ai-gateway.ts";
