"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MathRenderer } from "@/components/MathRenderer";
import { ChatInterface } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

interface Problem {
  id: string;
  title: string;
  body: string;
  solution: string;
  difficulty: string;
  topic: {
    name: string;
    slug: string;
  };
}

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.problemId as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch problem details
    const fetchProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${problemId}`);
        if (!response.ok) throw new Error("Failed to fetch problem");
        const data = await response.json();
        setProblem(data);
      } catch (error) {
        console.error("Error fetching problem:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Start the problem (create UserProblem record)
    const startProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${problemId}/start`, {
          method: "POST",
        });
        if (response.ok) {
          setHasStarted(true);
        }
      } catch (error) {
        console.error("Error starting problem:", error);
      }
    };

    fetchProblem();
    startProblem();
  }, [problemId]);

  const handleRating = async (rating: number) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/problems/${problemId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) throw new Error("Failed to submit review");

      // Navigate to next due problem or dashboard
      const dueResponse = await fetch("/api/problems/due");
      if (dueResponse.ok) {
        const dueProblems = await dueResponse.json();
        if (dueProblems.length > 0 && dueProblems[0].problem.id !== problemId) {
          router.push(`/app/study/${dueProblems[0].problem.id}`);
        } else {
          router.push("/app/dashboard");
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Problem not found.</p>
        <Link href="/app/topics">
          <Button className="mt-4">Browse Topics</Button>
        </Link>
      </div>
    );
  }

  const difficultyColor: Record<string, "default" | "secondary" | "destructive"> = {
    EASY: "default",
    MEDIUM: "secondary",
    HARD: "destructive",
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/app/topics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/app/topics/${problem.topic.slug}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {problem.topic.name}
            </Link>
            <span className="text-muted-foreground">/</span>
            <Badge variant={difficultyColor[problem.difficulty]}>
              {problem.difficulty}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
        {/* Problem Panel */}
        <div className="lg:col-span-3 space-y-6 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle>Problem</CardTitle>
            </CardHeader>
            <CardContent>
              <MathRenderer content={problem.body} />
            </CardContent>
          </Card>

          {/* Solution Toggle */}
          <div className="flex items-center gap-4">
            <Switch
              id="show-solution"
              checked={showSolution}
              onCheckedChange={setShowSolution}
            />
            <label htmlFor="show-solution" className="font-medium cursor-pointer">
              Show Solution
            </label>
          </div>

          {/* Solution */}
          {showSolution && (
            <Card>
              <CardHeader>
                <CardTitle>Solution</CardTitle>
              </CardHeader>
              <CardContent>
                <MathRenderer content={problem.solution} />
              </CardContent>
            </Card>
          )}

          {/* Rating Buttons */}
          {showSolution && (
            <Card>
              <CardHeader>
                <CardTitle>How well did you know this?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => handleRating(0)}
                    disabled={isSubmitting}
                  >
                    Again (0)
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleRating(1)}
                    disabled={isSubmitting}
                  >
                    Hard (1)
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleRating(3)}
                    disabled={isSubmitting}
                  >
                    Good (3)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRating(5)}
                    disabled={isSubmitting}
                  >
                    Easy (5)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-2 h-full min-h-[400px]">
          <ChatInterface problemId={problemId} />
        </div>
      </div>
    </div>
  );
}
