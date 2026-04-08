import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all topics with their subtopics and problems
    const topics = await prisma.topic.findMany({
      where: {
        parentId: null, // Only top-level topics
      },
      include: {
        children: {
          include: {
            problems: true,
          },
        },
        problems: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    // Get user's progress for all problems
    const userProblems = await prisma.userProblem.findMany({
      where: {
        userId: session.user.id,
      },
    });

    const userProblemMap = new Map(
      userProblems.map((up) => [up.problemId, up])
    );

    // Calculate progress for each topic
    const topicsWithProgress = topics.map((topic) => {
      const allProblems = [
        ...topic.problems,
        ...topic.children.flatMap((c) => c.problems),
      ];

      const masteredCount = allProblems.filter((p) => {
        const up = userProblemMap.get(p.id);
        return up?.status === "MASTERED";
      }).length;

      const totalCount = allProblems.length;

      return {
        ...topic,
        progress: {
          mastered: masteredCount,
          total: totalCount,
          percentage: totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0,
        },
      };
    });

    return NextResponse.json(topicsWithProgress);
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}
