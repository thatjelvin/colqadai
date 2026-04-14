import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ErrorLogPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const dbUser = await getOrCreateUserForSupabaseId(user.id, user.email!);
  const userId = dbUser.id;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [attempts, grouped] = await Promise.all([
    prisma.problemAttempt.findMany({
      where: {
        userId,
        isCorrect: false,
      },
      include: {
        problem: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 150,
    }),
    prisma.problemAttempt.groupBy({
      by: ["errorType"],
      where: {
        userId,
        isCorrect: false,
        createdAt: {
          gte: weekAgo,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          errorType: "desc",
        },
      },
    }),
  ]);

  const topError = grouped.find((item) => item.errorType);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Error Log</h1>
        <p className="text-muted-foreground">Track mistakes by error type and re-attempt deliberately.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
          <CardDescription>
            {topError
              ? `Your most common error is ${topError.errorType?.replaceAll("_", " ").toLowerCase()} (${topError._count._all} attempts).`
              : "No wrong attempts recorded this week."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mistake History</CardTitle>
          <CardDescription>Sorted by most recent.</CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mistakes logged yet.</p>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div key={attempt.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{attempt.problem.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{attempt.problem.topic.name}</p>
                    <p className="text-sm mt-2">{attempt.errorType?.replaceAll("_", " ") || "Unclassified"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{attempt.errorExplanation || "No explanation available."}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-2">{new Date(attempt.createdAt).toLocaleDateString()}</p>
                    <Link href={`/study/${attempt.problemId}`}>
                      <Button size="sm" variant="outline">Re-attempt</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
