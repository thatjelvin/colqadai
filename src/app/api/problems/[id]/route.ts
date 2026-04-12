import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }
    await getOrCreateUserForClerkId(clerkUserId);

    const problem = await prisma.problem.findUnique({
      where: { id: params.id },
      include: {
        topic: true,
      },
    });

    if (!problem) {
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(problem);
  } catch (error) {
    console.error("Error fetching problem:", error);
    return NextResponse.json(
      { error: "Failed to fetch problem" },
      { status: 500 }
    );
  }
}
