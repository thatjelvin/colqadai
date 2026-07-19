"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, X } from "lucide-react";

interface GroupChallengeBannerProps {
  groupId: string;
  onCreated: () => void;
}

export function GroupChallengeBanner({ groupId, onCreated }: GroupChallengeBannerProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [problemCount, setProblemCount] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          problemCount,
          dueBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create challenge");
      }

      setOpen(false);
      setTitle("");
      setDescription("");
      setProblemCount(10);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Challenge
      </Button>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Create Group Challenge</CardTitle>
          <CardDescription>Set a challenge for your group.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="challenge-title">Title *</Label>
            <Input
              id="challenge-title"
              placeholder="e.g. Integration Bee Prep"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="challenge-desc">Description</Label>
            <textarea
              id="challenge-desc"
              className="w-full min-h-[60px] rounded-md border bg-background p-3 text-sm resize-y"
              placeholder="What should members focus on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="problem-count">Target Problems</Label>
            <Input
              id="problem-count"
              type="number"
              min={1}
              max={100}
              value={problemCount}
              onChange={(e) => setProblemCount(parseInt(e.target.value, 10) || 10)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !title.trim()} size="sm">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                "Create Challenge"
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
