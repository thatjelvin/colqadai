"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConceptReviewItem } from "./ConceptReviewItem";
import { Brain, Loader2 } from "lucide-react";

interface DueConceptItem {
  id: string;
  concept: string;
  nextReviewAt: string;
  repetitions: number;
  easeFactor: number;
}

export function ConceptReviewSection() {
  const [items, setItems] = useState<DueConceptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDue = useCallback(async () => {
    try {
      const res = await fetch("/api/review/concepts/due");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDue();
  }, [fetchDue]);

  const handleComplete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-500" />
            Concept Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // Silently hide on error
  }

  if (items.length === 0) {
    return null; // Don't show when empty
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-500" />
          <div>
            <CardTitle className="text-base">Concept Reviews</CardTitle>
            <CardDescription>
              {items.length} concept{items.length !== 1 ? "s" : ""} due for review from your AI tutor chats
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <ConceptReviewItem
            key={item.id}
            concept={item.concept}
            repetitions={item.repetitions}
            easeFactor={item.easeFactor}
            onComplete={() => handleComplete(item.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
