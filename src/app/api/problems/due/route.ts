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

    const withUrgency = dueProblems.map((item) => {
      const overdueDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(item.nextReviewAt).getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        ...item,
        urgencyScore: 1 + overdueDays,
      };
    });

    return NextResponse.json(withUrgency);
  } catch (error) {
    console.error("Error fetching due problems:", error);
    return NextResponse.json(
      { error: "Failed to fetch due problems" },
      { status: 500 }
    );
  }
}
