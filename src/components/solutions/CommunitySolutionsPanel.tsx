"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolutionCard } from "./SolutionCard";
import { SolutionSubmitForm } from "./SolutionSubmitForm";
import { ReportDialog } from "./ReportDialog";
import { Loader2, Users } from "lucide-react";

interface SolutionData {
  id: string;
  solution: string;
  isAlternativeMethod: boolean;
  upvotes: number;
  downvotes: number;
  userVote: "UP" | "DOWN" | "NONE";
  isOwn: boolean;
  createdAt: string;
}

interface CommunitySolutionsPanelProps {
  problemId: string;
  showSubmit?: boolean;
}

export function CommunitySolutionsPanel({ problemId, showSubmit = true }: CommunitySolutionsPanelProps) {
  const [solutions, setSolutions] = useState<SolutionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/problems/${problemId}/solutions`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSolutions(data.solutions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load solutions");
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    fetchSolutions();
  }, [fetchSolutions]);

  const handleVote = async (solutionId: string, vote: "UP" | "DOWN") => {
    try {
      const res = await fetch(`/api/solutions/${solutionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) return;
      const data = await res.json();

      setSolutions((prev) =>
        prev.map((s) =>
          s.id === solutionId
            ? { ...s, upvotes: data.newUpvotes, downvotes: data.newDownvotes, userVote: data.newVote }
            : s
        )
      );
    } catch {
      // ignore
    }
  };

  const handleReport = () => {
    // Report handled by dialog; just refresh
  };

  const handleDelete = async (solutionId: string) => {
    try {
      const res = await fetch(`/api/solutions/${solutionId}`, { method: "DELETE" });
      if (res.ok) {
        setSolutions((prev) => prev.filter((s) => s.id !== solutionId));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Community Solutions</h3>
        </div>
        {showSubmit && (
          <SolutionSubmitForm problemId={problemId} onSubmitted={fetchSolutions} />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : solutions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No community solutions yet. Be the first to share your approach!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {solutions.map((solution) => (
            <SolutionCard
              key={solution.id}
              solution={solution}
              onVote={(vote) => handleVote(solution.id, vote)}
              onReport={() => {}} // ReportDialog is separate
              onDelete={() => handleDelete(solution.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
