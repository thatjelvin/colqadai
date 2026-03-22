import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    const dueProblems = await prisma.userProblem.findMany({
      where: {
        userId: session.user.id,
        nextReviewAt: {
          lte: now,
        },
      },
      include: {
        problem: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: {
        nextReviewAt: "asc",
      },
      take: 10,
    });

    return NextResponse.json(dueProblems);
  } catch (error) {
    console.error("Error fetching due problems:", error);
    return NextResponse.json(
      { error: "Failed to fetch due problems" },
      { status: 500 }
    );
  }
}
