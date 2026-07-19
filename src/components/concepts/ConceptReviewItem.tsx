"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, XCircle } from "lucide-react";

interface ConceptReviewItemProps {
  concept: string;
  repetitions: number;
  easeFactor: number;
  onComplete: () => void;
}

export function ConceptReviewItem({ concept, repetitions, easeFactor, onComplete }: ConceptReviewItemProps) {
  const [rated, setRated] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRate = async (value: number) => {
    if (submitting || rated) return;
    setSubmitting(true);
    setRating(value);

    try {
      const res = await fetch(`/api/review/concept/${encodeURIComponent(concept)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });

      if (res.ok) {
        setRated(true);
        onComplete();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">Concept Review</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            EF: {easeFactor.toFixed(2)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-semibold text-sm">{concept}</p>

        {!rated ? (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Did you remember this concept?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleRate(5)}
                disabled={submitting}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Yes, fully
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleRate(1)}
                disabled={submitting}
              >
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                No, review again
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleRate(3)}
                disabled={submitting}
              >
                Partially
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {rating && rating >= 3
              ? "Great! Concept scheduled for next review."
              : "Concept added back to queue for review."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
