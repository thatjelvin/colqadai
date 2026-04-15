import { createServerClient } from "@/lib/supabase/server";

type Plan = "FREE" | "PRO" | "MAX";
type SubscriptionStatus = "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

export type AppUser = {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
  image: string | null;
  grade: string | null;
  course: string | null;
  age: number | null;
  source: string | null;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: Date | null;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  paddlePriceId: string | null;
  createdAt: Date;
};

function toPlan(value: string | null | undefined): Plan {
  return value === "PRO" || value === "MAX" ? value : "FREE";
}

function toSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
  if (value === "ACTIVE" || value === "PAST_DUE" || value === "CANCELED" || value === "TRIALING") {
    return value;
  }
  return "INACTIVE";
}

export async function getOrCreateUserForSupabaseId(
  supabaseId: string,
  email: string,
  name?: string | null,
  image?: string | null
): Promise<AppUser> {
  const supabase = createServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, grade, course, age, source, plan, subscription_status, subscription_current_period_end, paddle_customer_id, paddle_subscription_id, paddle_price_id, created_at"
    )
    .eq("id", supabaseId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.warn("AUTH WARN: failed to read optional profile", { supabaseId, error });
  }

  return {
    id: supabaseId,
    supabaseId,
    email,
    name: profile?.full_name ?? name ?? null,
    image: profile?.avatar_url ?? image ?? null,
    grade: profile?.grade ?? null,
    course: profile?.course ?? null,
    age: profile?.age ?? null,
    source: profile?.source ?? null,
    plan: toPlan(profile?.plan),
    subscriptionStatus: toSubscriptionStatus(profile?.subscription_status),
    subscriptionCurrentPeriodEnd: profile?.subscription_current_period_end
      ? new Date(profile.subscription_current_period_end)
      : null,
    paddleCustomerId: profile?.paddle_customer_id ?? null,
    paddleSubscriptionId: profile?.paddle_subscription_id ?? null,
    paddlePriceId: profile?.paddle_price_id ?? null,
    createdAt: profile?.created_at ? new Date(profile.created_at) : new Date(),
  };
}
