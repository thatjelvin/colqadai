import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createPaddleCheckout } from "@/lib/payments/paddle";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "max"]),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
    if (!dbUser.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const transaction = await createPaddleCheckout({
      plan: parsed.data.plan,
      userId: dbUser.id,
      userEmail: dbUser.email,
      customerId: dbUser.paddleCustomerId,
    });

    if (!transaction.checkout?.url) {
      return NextResponse.json({ error: "Checkout URL unavailable" }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl: transaction.checkout.url, transactionId: transaction.id });
  } catch (error) {
    console.error("Error creating checkout:", error);
    return NextResponse.json({ error: "Failed to initialize checkout" }, { status: 500 });
  }
}
