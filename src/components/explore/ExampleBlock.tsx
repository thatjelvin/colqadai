"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
import { ChevronDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Example } from "@/lib/learning/summary-schema";

export function ExampleBlock({ example, index }: { example: Example; index: number }) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="bg-card">
      <CardContent className="space-y-3 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary/20 text-secondary-foreground">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-base font-semibold text-foreground sm:text-lg">
                Example {index + 1}
              </h4>
              <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                )}
                aria-expanded={open}
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                />
                {open ? "Hide" : "Show"} solution
              </button>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Problem
              </p>
              <div className="mt-1">
                <MathRenderer content={example.problem} />
              </div>
            </div>
            {open && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Solution
                </p>
                <div className="mt-1">
                  <MathRenderer content={example.solution} />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
