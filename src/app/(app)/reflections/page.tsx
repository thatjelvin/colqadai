import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ReflectionsPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    redirect("/sign-in");
  }
  const dbUser = await getOrCreateUserForClerkId(clerkUserId);

  const reflections = await prisma.reflection.findMany({
    where: { userId: dbUser.id },
    include: {
      problem: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reflections</h1>
        <p className="text-muted-foreground">Your elaborative interrogation history.</p>
      </div>

      {reflections.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No reflections yet. Complete a correct attempt and respond to the follow-up prompt.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reflections.map((reflection) => (
            <Card key={reflection.id}>
              <CardHeader>
                <CardTitle className="text-lg">{reflection.problem.title}</CardTitle>
                <CardDescription>{reflection.problem.topic.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Prompt</p>
                  <p className="text-sm text-muted-foreground">{reflection.prompt}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Your reflection</p>
                  <p className="text-sm text-muted-foreground">{reflection.response}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{new Date(reflection.createdAt).toLocaleString()}</p>
                  <Link href={`/study/${reflection.problemId}`}>
                    <Button size="sm" variant="outline">Retry Problem</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
