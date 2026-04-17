import OpenAI from "openai";
import { env } from "@/lib/env";

export const grok = new OpenAI({
  apiKey: env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});
