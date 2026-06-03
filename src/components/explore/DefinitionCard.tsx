"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
import { BookOpen } from "lucide-react";
import type { Definition } from "@/lib/learning/summary-schema";

export function DefinitionCard({ definition }: { definition: Definition }) {
  return (
    <Card className="bg-card">
      <CardContent className="space-y-3 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-base font-semibold text-foreground sm:text-lg">
                {definition.name}
              </h4>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Definition
              </span>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <MathRenderer content={definition.formal_statement} />
            </div>
            <p className="text-sm leading-6 text-foreground/90 sm:text-base sm:leading-7">
              {definition.explanation}
            </p>
            {definition.example && (
              <div className="space-y-1 rounded-md bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Example
                </p>
                <div className="text-sm text-foreground/90">
                  <MathRenderer content={definition.example} />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
