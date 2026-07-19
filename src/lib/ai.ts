import OpenAI from "openai";
import { env } from "@/lib/env";

export const ai = new OpenAI({
  apiKey: env.OPENCODE_API_KEY,
  baseURL: "https://opencode.ai/zen/v1",
});
