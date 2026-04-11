import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaddleCheckout } from "@/lib/payments/paddle";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "max"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { paddleCustomerId: true },
    });

    const transaction = await createPaddleCheckout({
      plan: parsed.data.plan,
      userId: session.user.id,
      userEmail: session.user.email,
      customerId: user?.paddleCustomerId,
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
