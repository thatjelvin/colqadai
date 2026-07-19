import "server-only";
import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  // AI Provider (OpenCode Zen)
  OPENCODE_API_KEY: z.string().min(1, "OPENCODE_API_KEY is required"),

  // Supabase Auth
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Optional services — app works without these configured
  RESEND_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  // Paddle billing
  PADDLE_ENVIRONMENT: z.enum(["sandbox", "production"]).optional(),
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_PRO_PRICE_ID: z.string().optional(),
  PADDLE_MAX_PRICE_ID: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:");
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  });
  throw new Error("Invalid environment variables");
}

const validated = parsedEnv.data;

if (!validated.DIRECT_URL) {
  console.warn(
    "DIRECT_URL is not set. Set it to a direct Postgres connection for maintenance/migration workflows that should not use pooled URLs."
  );
}

if (validated.PADDLE_ENVIRONMENT === "production") {
  const missingProdBillingVars = [
    "PADDLE_API_KEY",
    "PADDLE_WEBHOOK_SECRET",
    "PADDLE_PRO_PRICE_ID",
    "PADDLE_MAX_PRICE_ID",
  ].filter((key) => !validated[key as keyof typeof validated]);

  if (missingProdBillingVars.length > 0) {
    throw new Error(
      `Missing Paddle production configuration: ${missingProdBillingVars.join(", ")}`
    );
  }
}

if (validated.PADDLE_ENVIRONMENT === "sandbox" && validated.PADDLE_API_KEY?.startsWith("pdl_live_")) {
  throw new Error(
    "PADDLE_ENVIRONMENT is sandbox but PADDLE_API_KEY starts with pdl_live_. Set PADDLE_ENVIRONMENT=production or use a sandbox key."
  );
}

if (validated.PADDLE_ENVIRONMENT === "production" && validated.PADDLE_API_KEY?.startsWith("pdl_snd_")) {
  throw new Error(
    "PADDLE_ENVIRONMENT is production but PADDLE_API_KEY starts with pdl_snd_. Set PADDLE_ENVIRONMENT=sandbox or use a production key."
  );
}

export const env = validated;
