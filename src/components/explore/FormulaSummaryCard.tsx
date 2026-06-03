"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
import { Sigma } from "lucide-react";
import type { FormulaSummary as FormulaSummaryType } from "@/lib/learning/summary-schema";

export function FormulaSummaryCard({ formula }: { formula: FormulaSummaryType }) {
  return (
    <Card className="bg-card">
      <CardContent className="space-y-2 px-6 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Sigma className="h-4 w-4" />
          </span>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {formula.name}
            </p>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground">
              <MathRenderer content={formula.formula} />
            </div>
            {formula.notes && (
              <p className="text-xs leading-5 text-muted-foreground">{formula.notes}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
