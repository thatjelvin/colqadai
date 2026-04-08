import crypto from "crypto";
import { PlanCode } from "@/lib/billing/plans";
import { env } from "@/lib/env";

const PADDLE_BASE_URL = env.PADDLE_ENVIRONMENT === "sandbox"
  ? "https://sandbox-api.paddle.com"
  : "https://api.paddle.com";

const API_KEY = env.PADDLE_API_KEY;
const PRO_PRICE_ID = env.PADDLE_PRO_PRICE_ID;
const MAX_PRICE_ID = env.PADDLE_MAX_PRICE_ID;

export const PADDLE_PRICE_MAP: Record<string, PlanCode> = {
  ...(PRO_PRICE_ID ? { [PRO_PRICE_ID]: "pro" } : {}),
  ...(MAX_PRICE_ID ? { [MAX_PRICE_ID]: "max" } : {}),
};

function requireApiKey() {
  if (!API_KEY) {
    throw new Error("PADDLE_API_KEY is not configured.");
  }
}

function getPriceIdForPlan(plan: PlanCode): string {
  if (plan === "pro" && PRO_PRICE_ID) return PRO_PRICE_ID;
  if (plan === "max" && MAX_PRICE_ID) return MAX_PRICE_ID;
  throw new Error(`Missing Paddle price ID for plan: ${plan}`);
}

export async function createPaddleCheckout(params: {
  plan: PlanCode;
  userId: string;
  userEmail: string;
  customerId?: string | null;
}) {
  requireApiKey();
  const priceId = getPriceIdForPlan(params.plan);

  const payload = {
    items: [{ price_id: priceId, quantity: 1 }],
    customer: {
      email: params.userEmail,
      ...(params.customerId ? { id: params.customerId } : {}),
    },
    custom_data: {
      userId: params.userId,
      plan: params.plan,
    },
    billing_cycle: {
      interval: "month",
      frequency: 1,
    },
  };

  const response = await fetch(`${PADDLE_BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to create Paddle transaction: ${details}`);
  }

  const json = await response.json();
  return json.data as {
    id: string;
    checkout?: { url?: string };
  };
}

export function verifyPaddleWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) {
    return false;
  }

  const pairs = signatureHeader.split(";").map((part) => part.trim());
  const timestampPart = pairs.find((part) => part.startsWith("ts="));
  const hashPart = pairs.find((part) => part.startsWith("h1="));

  if (!timestampPart || !hashPart) {
    return false;
  }

  const timestamp = timestampPart.slice(3);
  const expectedHash = hashPart.slice(3);

  const signedPayload = `${timestamp}:${rawBody}`;
  const digest = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}
