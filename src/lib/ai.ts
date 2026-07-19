import OpenAI from "openai";
import { env } from "@/lib/env";

let _ai: OpenAI | null = null;

function getApiKey(): string {
  if (env.OPENCODE_API_KEY) return env.OPENCODE_API_KEY;
  // Only read process.env directly for the fallback key at call time
  const openaiKey = typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined;
  if (openaiKey) return openaiKey;
  // Return a placeholder so instantiation doesn't crash — will throw on first use
  return "sk-placeholder";
}

function createClient(): OpenAI {
  const apiKey = getApiKey();
  if (apiKey === "sk-placeholder") {
    throw new Error(
      "AI client not configured: set OPENCODE_API_KEY in your environment variables"
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://opencode.ai/zen/v1",
  });
}

export function getAi(): OpenAI {
  if (!_ai) {
    _ai = createClient();
  }
  return _ai;
}

/** Backwards-compatible export for callers that reference `ai` directly. */
export const ai = new Proxy({} as OpenAI, {
  get(_target, prop: keyof OpenAI) {
    return getAi()[prop];
  },
});
