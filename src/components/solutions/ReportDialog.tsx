"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X, Flag } from "lucide-react";

interface ReportDialogProps {
  solutionId: string;
  onReported: () => void;
}

export function ReportDialog({ solutionId, onReported }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/solutions/${solutionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to report");
      }

      setDone(true);
      onReported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    );
  }

  if (done) {
    return (
      <Card className="border-muted">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Report submitted. Thank you.</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setOpen(false); setDone(false); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-red-600 dark:text-red-400">Report Solution</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setOpen(false); setReason(""); setError(null); }}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="report-reason">Why does this violate our guidelines?</Label>
            <textarea
              id="report-reason"
              className="w-full min-h-[80px] rounded-md border bg-background p-3 text-sm resize-y mt-1"
              placeholder="Explain why this solution should be reviewed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !reason.trim()} size="sm">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); setReason(""); setError(null); }} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
