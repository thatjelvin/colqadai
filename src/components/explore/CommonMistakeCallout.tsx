"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type { CommonMistake } from "@/lib/learning/summary-schema";

export function CommonMistakeCallout({ mistake }: { mistake: CommonMistake }) {
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="space-y-2 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning/20 text-warning">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-foreground sm:text-base">
                {mistake.error}
              </p>
              <span className="text-[10px] font-medium uppercase tracking-wider text-warning">
                Watch out
              </span>
            </div>
            <p className="text-sm leading-6 text-foreground/85">
              <span className="font-medium text-foreground">Why it happens: </span>
              {mistake.why}
            </p>
            <p className="text-sm leading-6 text-foreground/85">
              <span className="font-medium text-foreground">How to fix: </span>
              {mistake.fix}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
