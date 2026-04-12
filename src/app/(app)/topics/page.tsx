import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TopicTree } from "@/components/TopicTree";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";

export default async function TopicsPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect("/sign-in");
  }
  const dbUser = await getOrCreateUserForClerkId(clerkUserId);
  const userId = dbUser.id;

  // Get all topics with their subtopics and problems
  const topics = await prisma.topic.findMany({
    where: {
      parentId: null,
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
      userId,
    },
  });

  const userProblemMap = new Map(userProblems.map((up) => [up.problemId, up]));

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
      children: topic.children.map((child) => ({
        ...child,
        children: [],
      })),
      progress: {
        mastered: masteredCount,
        total: totalCount,
        percentage: totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0,
      },
    };
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Topics</h1>
        <p className="text-muted-foreground">
          Browse all mathematical concepts and track your progress
        </p>
      </div>

      <div>
        <TopicTree topics={topicsWithProgress} />
      </div>
    </div>
  );
}
