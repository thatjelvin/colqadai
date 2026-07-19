"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X } from "lucide-react";

interface SolutionSubmitFormProps {
  problemId: string;
  onSubmitted: () => void;
}

export function SolutionSubmitForm({ problemId, onSubmitted }: SolutionSubmitFormProps) {
  const [open, setOpen] = useState(false);
  const [solution, setSolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solution.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/problems/${problemId}/solutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solution: solution.trim(), isAlternativeMethod: false }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit solution");
      }

      setSolution("");
      setOpen(false);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Share Your Solution
      </Button>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Share Your Approach</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="solution">Your Solution</Label>
            <textarea
              id="solution"
              className="w-full min-h-[120px] rounded-md border bg-background p-3 text-sm resize-y mt-1"
              placeholder="Write your solution here... Use LaTeX with $...$ for math notation."
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !solution.trim()} size="sm">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
