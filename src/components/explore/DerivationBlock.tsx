"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
import { ChevronDown, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Derivation } from "@/lib/learning/summary-schema";

export function DerivationBlock({ derivation }: { derivation: Derivation }) {
  const [open, setOpen] = useState(false);
  const stepCount = derivation.steps.length;

  return (
    <Card className="bg-card">
      <CardContent className="space-y-3 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Sigma className="h-4 w-4" />
          </span>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Derivation
              </p>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {stepCount} step{stepCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Result
              </p>
              <div className="mt-1 text-foreground">
                <MathRenderer content={derivation.result} />
              </div>
            </div>
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
              {open ? "Hide" : "Show"} step-by-step
            </button>
            {open && (
              <ol className="space-y-3 border-l-2 border-border pl-4">
                {derivation.steps.map((step, index) => (
                  <li key={index} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Step {index + 1} · {step.description}
                    </p>
                    <div className="rounded-md bg-muted/30 px-3 py-2 text-sm text-foreground">
                      <MathRenderer content={step.math} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
