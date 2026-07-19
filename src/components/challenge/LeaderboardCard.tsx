"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  completions: number;
}

export function LeaderboardCard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/challenge/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setEntries(data.leaderboard || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground w-4 text-center">{rank}</span>;
  };

  const anonymousName = (index: number) => `Student #${(index * 7 + 3) % 1000}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <div>
            <CardTitle className="text-base">Weekly Challenge Leaderboard</CardTitle>
            <CardDescription>Top challenge solvers this week</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Could not load leaderboard.
          </p>
        ) : entries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No challenge completions yet this week.</p>
            <p className="text-xs text-muted-foreground mt-1">Complete today&apos;s challenge to be the first!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {entries.slice(0, 10).map((entry, index) => {
              const displayName = anonymousName(index);
              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-md text-sm",
                    index < 3 && "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {getRankIcon(entry.rank)}
                    <span className="text-sm">{displayName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {entry.completions} day{entry.completions !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
