"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Theorem } from "@/lib/learning/summary-schema";

export function TheoremCard({ theorem }: { theorem: Theorem }) {
  const [open, setOpen] = useState(false);
  const hasSketch = Boolean(theorem.proof_sketch && theorem.proof_sketch.length > 0);

  return (
    <Card className="bg-card">
      <CardContent className="space-y-3 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-base font-semibold text-foreground sm:text-lg">
                {theorem.name}
              </h4>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Theorem
              </span>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <MathRenderer content={theorem.statement} />
            </div>
            {theorem.key_conditions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Conditions
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
                  {theorem.key_conditions.map((condition) => (
                    <li key={condition}>
                      <MathRenderer content={condition} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasSketch && (
              <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                )}
                aria-expanded={open}
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                />
                {open ? "Hide" : "Show"} proof sketch
              </button>
            )}
            {hasSketch && open && (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-foreground/90">
                <MathRenderer content={theorem.proof_sketch ?? ""} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
