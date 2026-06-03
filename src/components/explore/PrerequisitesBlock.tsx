"use client";

import { Badge } from "@/components/ui/badge";

export function PrerequisitesBlock({ prerequisites }: { prerequisites: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {prerequisites.map((item) => (
        <Badge key={item} variant="secondary" className="px-3 py-1 text-sm font-normal">
          {item}
        </Badge>
      ))}
    </div>
  );
}
