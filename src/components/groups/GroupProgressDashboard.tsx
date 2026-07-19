"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Loader2 } from "lucide-react";

interface ChallengeProgress {
  id: string;
  title: string;
  description: string | null;
  topicSlugs: string[];
  problemCount: number;
  status: "active" | "completed" | "cancelled";
  dueBy: string;
  myProgress: number;
  memberCount: number;
}

interface GroupProgressDashboardProps {
  groupId: string;
}

export function GroupProgressDashboard({ groupId }: GroupProgressDashboardProps) {
  const [challenges, setChallenges] = useState<ChallengeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/challenges`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const active = challenges.filter((c) => c.status === "active");
  const completed = challenges.filter((c) => c.status === "completed");

  return (
    <div className="space-y-4">
      {/* Active Challenges */}
      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Active Challenges
          </h3>
          <div className="space-y-3">
            {active.map((c) => (
              <Card key={c.id} className="border-green-200 dark:border-green-800/40">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{c.title}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {c.topicSlugs[0]?.replace(/-/g, " ") || "General"}
                    </Badge>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground mb-2">{c.description}</p>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Your progress: {c.myProgress}/{c.problemCount}</span>
                      <span className="text-muted-foreground">
                        Due {new Date(c.dueBy).toLocaleDateString()}
                      </span>
                    </div>
                    <Progress value={(c.myProgress / c.problemCount) * 100} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Challenges */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Past Challenges
          </h3>
          <div className="space-y-2">
            {completed.map((c) => (
              <Card key={c.id} className="border-muted">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">{c.title}</p>
                    <Badge variant="outline" className="text-[10px] text-green-600">
                      Completed
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.myProgress}/{c.problemCount} problems solved
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No challenges yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Group challenges will appear here when created.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
