import { createServerClient } from "@/lib/supabase/server";
import { Plan, ProfileRow, SubscriptionStatus } from "@/lib/db-types";

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
onboardingCompleted: boolean;
};

function toPlan(value: string | null | undefined): Plan {
return value === Plan.PRO || value === Plan.MAX ? value : Plan.FREE;
}

function toSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
if (
value === SubscriptionStatus.ACTIVE ||
value === SubscriptionStatus.PAST_DUE ||
value === SubscriptionStatus.CANCELED ||
value === SubscriptionStatus.TRIALING
) {
return value;
}
return SubscriptionStatus.INACTIVE;
}

export async function getOrCreateUserForSupabaseId(
supabaseId: string,
email: string,
name?: string | null,
image?: string | null
): Promise<AppUser> {
const supabase = createServerClient();
let profile: ProfileRow | null = null;

const { data, error } = await supabase
.from("profiles")
.select("id, full_name, avatar_url, grade, course, age, source, plan, subscription_status, subscription_current_period_end, paddle_customer_id, paddle_subscription_id, paddle_price_id, created_at, onboarding_completed")
.eq("id", supabaseId)
.maybeSingle();

profile = data;

if (error && error.code !== "PGRST116") {
console.warn("AUTH WARN: failed to read optional profile", { supabaseId, error });
}

// Create profile if it doesn't exist
if (!profile) {
const { error: upsertError } = await supabase.from("profiles").upsert(
{
id: supabaseId,
email,
full_name: name ?? null,
avatar_url: image ?? null,
},
{ onConflict: "id" }
);

if (upsertError) {
  console.warn("AUTH WARN: profile auto-create skipped", { supabaseId, error: upsertError });
} else {
  profile = {
    id: supabaseId,
    full_name: name ?? null,
    avatar_url: image ?? null,
    grade: null,
    course: null,
    age: null,
    source: null,
    plan: Plan.FREE,
    subscription_status: SubscriptionStatus.INACTIVE,
    subscription_current_period_end: null,
    paddle_customer_id: null,
    paddle_subscription_id: null,
    paddle_price_id: null,
    created_at: new Date().toISOString(),
    onboarding_completed: false, // ensure field exists
  } as ProfileRow;
}

}

// 🔥 FIXED: Proper mapping + boolean enforcement
const normalizedProfile = profile
? {
...profile,
onboardingCompleted: !!profile.onboarding_completed,
}
: null;

console.log("PROFILE AFTER MAPPING:", normalizedProfile);

return {
id: supabaseId,
supabaseId,
email,
name: normalizedProfile?.full_name ?? name ?? null,
image: normalizedProfile?.avatar_url ?? image ?? null,
grade: normalizedProfile?.grade ?? null,
course: normalizedProfile?.course ?? null,
age: normalizedProfile?.age ?? null,
source: normalizedProfile?.source ?? null,
plan: toPlan(normalizedProfile?.plan),
subscriptionStatus: toSubscriptionStatus(normalizedProfile?.subscription_status),
subscriptionCurrentPeriodEnd: normalizedProfile?.subscription_current_period_end
? new Date(normalizedProfile.subscription_current_period_end)
: null,
paddleCustomerId: normalizedProfile?.paddle_customer_id ?? null,
paddleSubscriptionId: normalizedProfile?.paddle_subscription_id ?? null,
paddlePriceId: normalizedProfile?.paddle_price_id ?? null,
createdAt: normalizedProfile?.created_at
? new Date(normalizedProfile.created_at)
: new Date(),

// 🔥 FIXED: NO fallback logic — single source of truth
onboardingCompleted: normalizedProfile?.onboardingCompleted ?? false,

};
}